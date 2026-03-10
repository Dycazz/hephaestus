import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpdateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'reminder_sent', 'confirmed', 'rescheduling', 'at_risk', 'completed', 'cancelled']).optional(),
  scheduledAt: z.string().datetime().optional(),
  technicianId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  prepChecklist: z.array(z.string()).optional(),
  reviewRequestSent: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
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
