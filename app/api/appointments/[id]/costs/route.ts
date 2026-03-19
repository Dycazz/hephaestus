/**
 * GET  /api/appointments/[id]/costs  — List job cost items for an appointment
 * POST /api/appointments/[id]/costs  — Add a job cost item
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const CreateCostItemSchema = z.object({
  category:        z.enum(['labor', 'material', 'equipment', 'subcontractor', 'overhead']),
  description:     z.string().min(1),
  quantity:        z.number().min(0).default(1),
  unit_cost_cents: z.number().int().min(0),
  technician_id:   z.string().uuid().nullable().optional(),
  hours:           z.number().min(0).nullable().optional(),
})

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id: appointmentId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('job_cost_items')
    .select(`
      *,
      technician:profiles ( id, name, hourly_rate_cents )
    `)
    .eq('appointment_id', appointmentId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cost_items: data })
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id: appointmentId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateCostItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Technicians can only add labor items for themselves
  if (profile.role === 'technician') {
    if (parsed.data.category !== 'labor') {
      return NextResponse.json({ error: 'Technicians can only add labor cost items.' }, { status: 403 })
    }
    if (parsed.data.technician_id && parsed.data.technician_id !== user.id) {
      return NextResponse.json({ error: 'Technicians can only log their own labor.' }, { status: 403 })
    }
    // Force technician_id to self
    parsed.data.technician_id = user.id
  } else if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify appointment belongs to this org
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, org_id')
    .eq('id', appointmentId)
    .eq('org_id', profile.org_id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const d = parsed.data
  const total_cost_cents = Math.round(d.quantity * d.unit_cost_cents)

  const { data, error } = await supabase
    .from('job_cost_items')
    .insert({
      org_id:          profile.org_id,
      appointment_id:  appointmentId,
      category:        d.category,
      description:     d.description,
      quantity:        d.quantity,
      unit_cost_cents: d.unit_cost_cents,
      total_cost_cents,
      technician_id:   d.technician_id ?? null,
      hours:           d.hours ?? null,
    })
    .select(`*, technician:profiles ( id, name, hourly_rate_cents )`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cost_item: data }, { status: 201 })
}
