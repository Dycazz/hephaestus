/**
 * POST /api/estimates/[id]/convert — Convert an accepted estimate into an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(3, '0')}`
}

export async function POST(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
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

  const orgId = profile.org_id

  // Fetch estimate with line items and taxes
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select('*, estimate_line_items (*), estimate_taxes (*)')
    .eq('id', id)
    .single()

  if (fetchError || !estimate) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }

  // Only accepted estimates can be converted (also allow sent/viewed for manual conversion)
  if (['invoiced', 'declined', 'expired'].includes(estimate.status)) {
    return NextResponse.json(
      { error: 'This estimate cannot be converted to an invoice.' },
      { status: 422 }
    )
  }

  // Already converted?
  if (estimate.invoice_id) {
    return NextResponse.json(
      { error: 'This estimate has already been converted to an invoice.', invoice_id: estimate.invoice_id },
      { status: 409 }
    )
  }

  // Atomically increment invoice number using service role
  const serviceClient = await createClient(true)
  const { data: org } = await serviceClient
    .from('organizations')
    .select('next_invoice_number')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const invoiceNumber = formatInvoiceNumber(org.next_invoice_number)
  await serviceClient
    .from('organizations')
    .update({ next_invoice_number: org.next_invoice_number + 1 })
    .eq('id', orgId)

  // Create the invoice with same totals as estimate
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      org_id:         orgId,
      client_id:      estimate.client_id,
      invoice_number: invoiceNumber,
      issued_date:    today,
      due_date:       dueDate,
      notes:          estimate.notes,
      subtotal_cents: estimate.subtotal_cents,
      tax_cents:      estimate.tax_cents,
      total_cents:    estimate.total_cents,
    })
    .select()
    .single()

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  // Copy line items from estimate to invoice
  const lineItems = (estimate.estimate_line_items ?? []).map((li: {
    appointment_id: string | null
    description: string
    quantity: number
    unit_price_cents: number
    total_cents: number
    tax_exempt: boolean
  }) => ({
    invoice_id:       invoice.id,
    appointment_id:   li.appointment_id,
    description:      li.description,
    quantity:         li.quantity,
    unit_price_cents: li.unit_price_cents,
    total_cents:      li.total_cents,
    tax_exempt:       li.tax_exempt,
  }))

  if (lineItems.length > 0) {
    await supabase.from('invoice_line_items').insert(lineItems)
  }

  // Copy tax snapshots
  const taxes = (estimate.estimate_taxes ?? []).map((t: {
    tax_rate_id: string | null
    name: string
    rate_percent: number
    tax_cents: number
  }) => ({
    invoice_id:   invoice.id,
    tax_rate_id:  t.tax_rate_id,
    name:         t.name,
    rate_percent: t.rate_percent,
    tax_cents:    t.tax_cents,
  }))

  if (taxes.length > 0) {
    await supabase.from('invoice_taxes').insert(taxes)
  }

  // Mark estimate as invoiced and link to invoice
  await supabase
    .from('estimates')
    .update({
      status:     'invoiced',
      invoice_id: invoice.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ invoice }, { status: 201 })
}
