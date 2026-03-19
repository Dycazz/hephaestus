/**
 * GET    /api/estimates/[id]  — Get estimate with line items + client
 * PATCH  /api/estimates/[id]  — Update (draft only)
 * DELETE /api/estimates/[id]  — Delete draft, or cancel others
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const LineItemSchema = z.object({
  appointment_id:   z.string().uuid().nullable().optional(),
  description:      z.string().min(1),
  quantity:         z.number().int().min(1).default(1),
  unit_price_cents: z.number().int().min(0),
  tax_exempt:       z.boolean().optional().default(false),
  sort_order:       z.number().int().optional().default(0),
})

const UpdateEstimateSchema = z.object({
  title:        z.string().nullable().optional(),
  issued_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:        z.string().nullable().optional(),
  line_items:   z.array(LineItemSchema).min(1).optional(),
  tax_rate_ids: z.array(z.string().uuid()).optional(),
})

async function getProfileAndEstimate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  estimateId: string
) {
  const [profileRes, estimateRes] = await Promise.all([
    supabase.from('profiles').select('org_id, role').eq('id', userId).single(),
    supabase
      .from('estimates')
      .select(`
        *,
        clients ( id, name, email, phone, address ),
        estimate_line_items ( * ),
        estimate_taxes ( * )
      `)
      .eq('id', estimateId)
      .single(),
  ])
  return { profile: profileRes.data, estimate: estimateRes.data, error: estimateRes.error }
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { estimate, error } = await getProfileAndEstimate(supabase, user.id, id)
  if (error || !estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ estimate })
}

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile, estimate } = await getProfileAndEstimate(supabase, user.id, id)
  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft'].includes(estimate.status)) {
    return NextResponse.json({ error: 'Only draft estimates can be edited.' }, { status: 422 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateEstimateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const d = parsed.data

  // Recompute totals if line items or tax rates provided
  let updatedFields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title !== undefined) updatedFields.title = d.title
  if (d.issued_date !== undefined) updatedFields.issued_date = d.issued_date
  if (d.expiry_date !== undefined) updatedFields.expiry_date = d.expiry_date
  if (d.notes !== undefined) updatedFields.notes = d.notes

  if (d.line_items || d.tax_rate_ids !== undefined) {
    const lineItems = d.line_items ?? estimate.estimate_line_items ?? []
    const taxRateIds = d.tax_rate_ids ?? (estimate.estimate_taxes ?? []).map((t: { tax_rate_id: string }) => t.tax_rate_id)

    let taxRates: { id: string; name: string; rate_percent: number }[] = []
    if (taxRateIds.length > 0) {
      const { data: rates } = await supabase
        .from('tax_rates')
        .select('id, name, rate_percent')
        .in('id', taxRateIds)
      taxRates = rates ?? []
    }

    const subtotal_cents = lineItems.reduce(
      (sum: number, li: { quantity: number; unit_price_cents: number }) => sum + li.quantity * li.unit_price_cents,
      0
    )
    const taxableSubtotal = lineItems
      .filter((li: { tax_exempt?: boolean }) => !li.tax_exempt)
      .reduce((sum: number, li: { quantity: number; unit_price_cents: number }) => sum + li.quantity * li.unit_price_cents, 0)

    const taxBreakdown = taxRates.map(r => ({
      tax_rate_id: r.id,
      name: r.name,
      rate_percent: r.rate_percent,
      tax_cents: Math.round(taxableSubtotal * r.rate_percent / 100),
    }))
    const tax_cents = taxBreakdown.reduce((s, t) => s + t.tax_cents, 0)

    updatedFields = {
      ...updatedFields,
      subtotal_cents,
      tax_cents,
      total_cents: subtotal_cents + tax_cents,
    }

    if (d.line_items) {
      // Replace line items
      await supabase.from('estimate_line_items').delete().eq('estimate_id', id)
      await supabase.from('estimate_line_items').insert(
        d.line_items.map((li, i) => ({
          estimate_id:      id,
          appointment_id:   li.appointment_id ?? null,
          description:      li.description,
          quantity:         li.quantity,
          unit_price_cents: li.unit_price_cents,
          total_cents:      li.quantity * li.unit_price_cents,
          tax_exempt:       li.tax_exempt,
          sort_order:       li.sort_order ?? i,
        }))
      )
    }

    if (d.tax_rate_ids !== undefined) {
      await supabase.from('estimate_taxes').delete().eq('estimate_id', id)
      if (taxBreakdown.length > 0) {
        await supabase.from('estimate_taxes').insert(
          taxBreakdown.map(t => ({
            estimate_id:  id,
            tax_rate_id:  t.tax_rate_id,
            name:         t.name,
            rate_percent: t.rate_percent,
            tax_cents:    t.tax_cents,
          }))
        )
      }
    }
  }

  const { data, error } = await supabase
    .from('estimates')
    .update(updatedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ estimate: data })
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile, estimate } = await getProfileAndEstimate(supabase, user.id, id)
  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (estimate.status === 'draft') {
    // Hard delete
    const { error } = await supabase.from('estimates').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Soft cancel — not applicable for estimates; return 422
    return NextResponse.json({ error: 'Only draft estimates can be deleted.' }, { status: 422 })
  }

  return new NextResponse(null, { status: 204 })
}
