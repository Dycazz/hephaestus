import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LogSchema = z.object({
  appointmentId: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound']),
  body: z.string().min(1),
  messageType: z.enum([
    'reminder', 'confirmation', 'customer_reply',
    'reschedule_link', 'review_request', 'general',
  ]),
})

/**
 * POST /api/sms/log
 * Writes a simulated (or manually triggered) SMS message to the
 * sms_messages table without sending anything via Twilio.
 * Used by the dashboard to persist reminder / reply / review messages.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = LogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const d = parsed.data

  // Look up org_id from the appointment (RLS ensures the user can only see their own)
  const { data: appt } = await supabase
    .from('appointments')
    .select('org_id')
    .eq('id', d.appointmentId)
    .single()

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const { data: msg, error } = await supabase
    .from('sms_messages')
    .insert({
      appointment_id: d.appointmentId,
      org_id: appt.org_id,
      direction: d.direction,
      body: d.body,
      message_type: d.messageType,
      delivery_status: 'logged',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: msg }, { status: 201 })
}
