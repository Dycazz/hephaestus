/**
 * PATCH  /api/appointments/[id]/costs/[costId]  — Update a cost item
 * DELETE /api/appointments/[id]/costs/[costId]  — Delete a cost item
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; costId: string }> }

const UpdateCostItemSchema = z.object({
  category:        z.enum(['labor', 'material', 'equipment', 'subcontractor', 'overhead']).optional(),
  description:     z.string().min(1).optional(),
  quantity:        z.number().min(0).optional(),
  unit_cost_cents: z.number().int().min(0).optional(),
  technician_id:   z.string().uuid().nullable().optional(),
  hours:           z.number().min(0).nullable().optional(),
})

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { costId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateCostItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const d = parsed.data

  // Recalculate total_cost_cents if qty or unit cost changed
  const updates: Record<string, unknown> = { ...d, updated_at: new Date().toISOString() }
  if (d.quantity !== undefined || d.unit_cost_cents !== undefined) {
    // Fetch existing to fill in missing values
    const { data: existing } = await supabase
      .from('job_cost_items')
      .select('quantity, unit_cost_cents')
      .eq('id', costId)
      .single()

    const qty = d.quantity ?? existing?.quantity ?? 1
    const unitCost = d.unit_cost_cents ?? existing?.unit_cost_cents ?? 0
    updates.total_cost_cents = Math.round(qty * unitCost)
  }

  const { data, error } = await supabase
    .from('job_cost_items')
    .update(updates)
    .eq('id', costId)
    .eq('org_id', profile.org_id)
    .select(`*, technician:profiles ( id, name, hourly_rate_cents )`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cost_item: data })
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const { costId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('job_cost_items')
    .delete()
    .eq('id', costId)
    .eq('org_id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
