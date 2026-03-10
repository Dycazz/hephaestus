import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { reminderTemplate } from '@/lib/sms-templates'

const SendSchema = z.object({
  appointmentId: z.string().uuid(),
  type: z.enum(['reminder', 'general']).default('reminder'),
  body: z.string().optional(),   // provide for 'general', auto-generated for 'reminder'
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = SendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { appointmentId, type } = parsed.data

  // Fetch appointment + client + technician + org
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select(`*, clients(name, phone), technicians(name), organizations(business_name, twilio_phone_number)`)
    .eq('id', appointmentId)
    .single()

  if (apptErr || !appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const client = appt.clients as { name: string; phone: string } | null
  const tech = appt.technicians as { name: string } | null
  const org = appt.organizations as { business_name: string; twilio_phone_number: string | null } | null

  if (!client?.phone) return NextResponse.json({ error: 'No customer phone number' }, { status: 400 })

  // Build message body
  const scheduledAt = new Date(appt.scheduled_at)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const apptDay = new Date(scheduledAt); apptDay.setHours(0, 0, 0, 0)
  const dateWord = apptDay.getTime() === today.getTime() ? 'today'
    : apptDay.getTime() === tomorrow.getTime() ? 'tomorrow'
    : scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const time = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const messageBody = parsed.data.body ?? reminderTemplate({
    customerFirstName: client.name.split(' ')[0],
    businessName: org?.business_name ?? 'Your service provider',
    service: appt.service,
    dateWord,
    time,
    technicianFirst: tech?.name.split(' ')[0] ?? 'your technician',
    prepChecklist: (appt.prep_checklist as string[]) ?? [],
  })

  // Send via Twilio
  let twilioSid: string | null = null
  let deliveryStatus = 'queued'

  try {
    twilioSid = await sendSMS({
      to: client.phone,
      body: messageBody,
      from: org?.twilio_phone_number ?? undefined,
    })
    deliveryStatus = 'sent'
  } catch (err) {
    // In dev without Twilio credentials, log and continue so UI still updates
    console.warn('[SMS] Twilio not configured — message not sent:', (err as Error).message)
    deliveryStatus = 'dev_skipped'
  }

  // Persist message to DB
  const { data: msg } = await supabase
    .from('sms_messages')
    .insert({
      appointment_id: appointmentId,
      org_id: appt.org_id,
      direction: 'outbound',
      body: messageBody,
      message_type: type,
      twilio_sid: twilioSid,
      delivery_status: deliveryStatus,
      to_number: client.phone,
      from_number: org?.twilio_phone_number ?? process.env.TWILIO_PHONE_NUMBER ?? null,
    })
    .select()
    .single()

  // Update appointment status to reminder_sent
  if (type === 'reminder') {
    await supabase
      .from('appointments')
      .update({ status: 'reminder_sent' })
      .eq('id', appointmentId)
  }

  return NextResponse.json({ message: msg, twilioSid, deliveryStatus }, { status: 201 })
}
