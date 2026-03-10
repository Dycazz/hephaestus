import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTwilioSignature } from '@/lib/sms'
import { confirmationTemplate, rescheduleTemplate } from '@/lib/sms-templates'
import { sendSMS } from '@/lib/sms'

/**
 * POST /api/sms/webhook
 * Twilio calls this URL for every inbound SMS to your Twilio number.
 * Configure in Twilio Console → Phone Numbers → Messaging → Webhook URL.
 *
 * Flow:
 *   "1"  → mark appointment confirmed, send confirmation text
 *   "2"  → mark appointment rescheduling, send reschedule link
 *   else → ignore (or log)
 */
export async function POST(request: NextRequest) {
  // Parse Twilio's application/x-www-form-urlencoded body
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })

  const fromNumber = params.From   // customer's phone
  const toNumber   = params.To     // your Twilio number
  const body       = (params.Body ?? '').trim()

  // Validate Twilio signature in production
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (authToken && process.env.NODE_ENV === 'production') {
    const signature = request.headers.get('x-twilio-signature') ?? ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`
    if (!validateTwilioSignature({ authToken, signature, url, params })) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Use service role to bypass RLS — webhook has no user session
  const supabase = await createClient(true)

  // Find which org owns this Twilio number
  const { data: org } = await supabase
    .from('organizations')
    .select('id, business_name, review_url')
    .eq('twilio_phone_number', toNumber)
    .single()

  if (!org) {
    console.warn('[Webhook] No org found for Twilio number:', toNumber)
    return twimlResponse('')  // empty TwiML = no auto-reply
  }

  // Find the most recent active appointment for this customer phone
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('org_id', org.id)
    .eq('phone', fromNumber)
    .single()

  const { data: appt } = client
    ? await supabase
        .from('appointments')
        .select('*, clients(name), technicians(name)')
        .eq('org_id', org.id)
        .eq('client_id', client.id)
        .in('status', ['reminder_sent', 'at_risk', 'scheduled'])
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single()
    : { data: null }

  // Save the inbound message
  if (appt) {
    await supabase.from('sms_messages').insert({
      appointment_id: appt.id,
      org_id: org.id,
      direction: 'inbound',
      body,
      message_type: 'customer_reply',
      from_number: fromNumber,
      to_number: toNumber,
      delivery_status: 'delivered',
    })
  }

  const reply = body.replace(/\s+/g, '').toLowerCase()

  if (appt && (reply === '1' || reply === 'yes' || reply === 'confirm')) {
    // Confirm appointment
    await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', appt.id)

    const scheduledAt = new Date(appt.scheduled_at)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const apptDay = new Date(scheduledAt); apptDay.setHours(0, 0, 0, 0)
    const dateWord = apptDay.getTime() === today.getTime() ? 'today'
      : apptDay.getTime() === tomorrow.getTime() ? 'tomorrow'
      : 'soon'
    const time = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const clientData = appt.clients as { name: string } | null
    const techData = appt.technicians as { name: string } | null

    const confirmMsg = confirmationTemplate({
      customerFirstName: clientData?.name.split(' ')[0] ?? 'there',
      dateWord,
      time,
      technicianFirst: techData?.name.split(' ')[0] ?? 'your technician',
      serviceIcon: appt.service_icon ?? '🔧',
    })

    // Save outbound confirmation
    await supabase.from('sms_messages').insert({
      appointment_id: appt.id,
      org_id: org.id,
      direction: 'outbound',
      body: confirmMsg,
      message_type: 'confirmation',
      to_number: fromNumber,
      from_number: toNumber,
      delivery_status: 'sent',
    })

    return twimlResponse(confirmMsg)
  }

  if (appt && (reply === '2' || reply === 'no' || reply === 'reschedule')) {
    // Trigger rescheduling
    await supabase
      .from('appointments')
      .update({ status: 'rescheduling' })
      .eq('id', appt.id)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
    const orgData = org as { id: string; business_name: string }
    const rescheduleUrl = `${baseUrl}/r/${orgData.id}/${appt.id}`

    const clientData = appt.clients as { name: string } | null
    const rescheduleMsg = rescheduleTemplate({
      customerFirstName: clientData?.name.split(' ')[0] ?? 'there',
      rescheduleUrl,
    })

    await supabase.from('sms_messages').insert({
      appointment_id: appt.id,
      org_id: org.id,
      direction: 'outbound',
      body: rescheduleMsg,
      message_type: 'reschedule_link',
      to_number: fromNumber,
      from_number: toNumber,
      delivery_status: 'sent',
    })

    return twimlResponse(rescheduleMsg)
  }

  // Unrecognised reply — no auto-response
  return twimlResponse('')
}

function twimlResponse(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}
