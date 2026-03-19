/**
 * GET    /api/invoices/[id]  — Fetch a single invoice with line items + client
 * PATCH  /api/invoices/[id]  — Update a draft invoice
 * DELETE /api/invoices/[id]  — Cancel (draft) or delete an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const LineItemSchema = z.object({
  id:               z.string().uuid().optional(),  // existing item to update; omit = new
  appointment_id:   z.string().uuid().nullable().optional(),
  description:      z.string().min(1),
  quantity:         z.number().int().min(1).default(1),
  unit_price_cents: z.number().int().min(0),
})

const PatchInvoiceSchema = z.object({
  issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().nullable().optional(),
  line_items:  z.array(LineItemSchema).min(1).optional(),
})

function computeTotals(
  lineItems: { quantity: number; unit_price_cents: number }[],
  taxRatePercent: number
) {
  const subtotal_cents = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price_cents, 0)
  const tax_cents = Math.round(subtotal_cents * taxRatePercent / 100)
  const total_cents = subtotal_cents + tax_cents
  return { subtotal_cents, tax_cents, total_cents }
}

type RouteContext = { params: Promise<{ id: string }> }

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      clients ( id, name, email, phone, address ),
      invoice_line_items (
        id, appointment_id, description, quantity, unit_price_cents, total_cents,
        appointments ( id, service, scheduled_at )
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })

  return NextResponse.json({ invoice })
}

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile / Org not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only draft invoices can be edited
  const { data: existing } = await supabase
    .from('invoices')
    .select('status, org_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft invoices can be edited' }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PatchInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const d = parsed.data

  // Fetch tax rate if line items are being updated
  let updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.issued_date) updates.issued_date = d.issued_date
  if (d.due_date)    updates.due_date    = d.due_date
  if ('notes' in d)  updates.notes       = d.notes ?? null

  if (d.line_items) {
    const { data: org } = await supabase
      .from('organizations')
      .select('tax_rate_percent')
      .eq('id', existing.org_id)
      .single()

    const { subtotal_cents, tax_cents, total_cents } = computeTotals(
      d.line_items,
      org?.tax_rate_percent ?? 0
    )
    updates = { ...updates, subtotal_cents, tax_cents, total_cents }

    // Replace all line items
    await supabase.from('invoice_line_items').delete().eq('invoice_id', id)
    await supabase.from('invoice_line_items').insert(
      d.line_items.map(li => ({
        invoice_id:       id,
        appointment_id:   li.appointment_id ?? null,
        description:      li.description,
        quantity:         li.quantity,
        unit_price_cents: li.unit_price_cents,
        total_cents:      li.quantity * li.unit_price_cents,
      }))
    )
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoice })
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'dispatcher'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only allow deleting draft or cancelled invoices
  const { data: existing } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  if (!['draft', 'cancelled'].includes(existing.status)) {
    // Sent/paid invoices: cancel instead of delete (preserve audit trail)
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ cancelled: true })
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
