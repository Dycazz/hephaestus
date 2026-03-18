import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { confirmationTemplate, rescheduleTemplate } from '@/lib/sms-templates'
import { notifyDispatcherSmsReply } from '@/lib/notifications'

/**
 * POST /api/sms/webhook
 * ClickSend calls this URL for every inbound SMS to your number.
 * Configure in ClickSend Dashboard → SMS → Settings → Inbound SMS Webhook.
 */
export async function POST(request: NextRequest) {
  let fromNumber: string | null = null
  let toNumber: string | null = null
  let body = ''

  const contentType = request.headers.get('content-type') || ''

  // Validate URL secret in production
  if (process.env.NODE_ENV === 'production') {
    const secret = new URL(request.url).searchParams.get('secret')
    if (secret !== process.env.CLICKSEND_WEBHOOK_SECRET) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  if (contentType.includes('application/json')) {
    const json = await request.json()
    fromNumber = json.from || null
    toNumber = json.to || null
    body = (json.body || '').trim()
  } else {
    const form = await request.formData()
    fromNumber = (form.get('from') || form.get('From')) as string | null
    toNumber = (form.get('to') || form.get('To')) as string | null
    body = ((form.get('body') || form.get('Text')) as string || '').trim()
  }

  if (!fromNumber || !toNumber) {
    console.warn('[Webhook] Missing from/to number in payload')
    return NextResponse.json({}, { status: 200 })
  }

  // Use service role to bypass RLS — webhook has no user session
  const supabase = await createClient(true)

  // Find which org owns this SMS number
  const { data: org } = await supabase
    .from('organizations')
    .select('id, business_name, review_url')
    .eq('sms_phone_number', toNumber)
    .single()

  if (!org) {
    console.warn('[Webhook] No org found for SMS number:', toNumber)
    return NextResponse.json({}, { status: 200 })
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

    // Notify all dispatchers/owners in the org who have a push token
    try {
      const { data: staffWithTokens } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('org_id', org.id)
        .in('role', ['owner', 'dispatcher'])
        .not('expo_push_token', 'is', null)

      if (staffWithTokens && staffWithTokens.length > 0) {
        const clientData = appt.clients as { name: string } | null
        const customerName = clientData?.name ?? 'A customer'
        for (const staff of staffWithTokens) {
          if (staff.expo_push_token) {
            await notifyDispatcherSmsReply({
              pushToken: staff.expo_push_token,
              customerName,
              message: body,
              appointmentId: appt.id,
            })
          }
        }
      }
    } catch (notifErr) {
      console.error('[Push] Failed to notify dispatchers:', notifErr)
    }
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

    // Send reply via ClickSend
    await sendSMS({ to: fromNumber, body: confirmMsg, from: toNumber })

    return NextResponse.json({}, { status: 200 })
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

    // Send reply via ClickSend
    await sendSMS({ to: fromNumber, body: rescheduleMsg, from: toNumber })

    return NextResponse.json({}, { status: 200 })
  }

  // Unrecognised reply — no auto-response
  return NextResponse.json({}, { status: 200 })
}
