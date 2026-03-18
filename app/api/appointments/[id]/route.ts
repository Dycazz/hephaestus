import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { notifyTechnicianAssigned } from '@/lib/notifications'
import { sendSMS } from '@/lib/sms'

const UpdateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'reminder_sent', 'confirmed', 'rescheduling', 'at_risk', 'completed', 'cancelled']).optional(),
  scheduledAt: z.string().datetime().optional(),
  technicianId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  prepChecklist: z.array(z.string()).optional(),
  reviewRequestSent: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
  autoReminder: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      clients ( id, name, phone, address ),
      technicians ( id, name, initials, color ),
      sms_messages ( * )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ appointment: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = UpdateAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  const d = parsed.data
  if (d.status !== undefined) updates.status = d.status
  if (d.scheduledAt !== undefined) updates.scheduled_at = d.scheduledAt
  if (d.technicianId !== undefined) updates.technician_id = d.technicianId
  if (d.notes !== undefined) updates.notes = d.notes
  if (d.prepChecklist !== undefined) updates.prep_checklist = d.prepChecklist
  if (d.reviewRequestSent !== undefined) updates.review_request_sent = d.reviewRequestSent
  if (d.completedAt !== undefined) updates.completed_at = d.completedAt
  if (d.autoReminder !== undefined) updates.auto_reminder = d.autoReminder

  if (d.status === 'completed' && !d.completedAt) {
    updates.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Fire notifications when a technician is assigned ─────────────────────
  if (d.technicianId && data) {
    try {
      // Fetch tech details and appt context in parallel
      const [techRes, apptRes] = await Promise.all([
        supabase
          .from('technicians')
          .select('phone, profiles ( expo_push_token )')
          .eq('id', d.technicianId)
          .maybeSingle(),
        supabase
          .from('appointments')
          .select('service, scheduled_at, clients ( name )')
          .eq('id', id)
          .single(),
      ])

      const techData = techRes.data
      const pushToken = (techData?.profiles as unknown as { expo_push_token: string | null } | null)?.expo_push_token
      const apptData = apptRes.data
      const clientRow = apptData?.clients as unknown as { name: string } | null
      const scheduledAtStr = (apptData?.scheduled_at as string) ?? data.scheduled_at
      const scheduledAt = new Date(scheduledAtStr)
      
      const scheduledTime = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tmrw = new Date(today); tmrw.setDate(today.getDate() + 1)
      const apptDay = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())
      const displayDate =
        apptDay.getTime() === today.getTime() ? 'Today' :
        apptDay.getTime() === tmrw.getTime() ? 'Tomorrow' :
        scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const customerName = clientRow?.name ?? 'Customer'
      const serviceName = (apptData?.service as string) ?? (data.service as string)

      // 1. Push
      if (pushToken) {
        await notifyTechnicianAssigned({
          pushToken,
          customerName,
          service: serviceName,
          scheduledDate: displayDate,
          scheduledTime,
          appointmentId: id,
        })
      }

      // 2. SMS
      if (techData?.phone) {
        await sendSMS({
          to: techData.phone,
          body: `New job assigned: ${serviceName} for ${customerName} on ${displayDate} at ${scheduledTime}. Check your dashboard for details.`,
        }).catch(err => console.error('[SMS] Tech notify failed:', err))
      }
    } catch (notifErr) {
      console.error('[Notif] Failed to notify technician on assignment:', notifErr)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ appointment: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete: set status to cancelled
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
