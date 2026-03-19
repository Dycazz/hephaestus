/**
 * GET  /api/invoices  — List invoices for the current org
 * POST /api/invoices  — Create a new draft invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrgPlanAccess } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format a sequential number as INV-001, INV-042, etc. */
function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(3, '0')}`
}

/** Compute totals from line items using the org's tax rate */
function computeTotals(
  lineItems: { quantity: number; unit_price_cents: number }[],
  taxRatePercent: number
) {
  const subtotal_cents = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price_cents, 0)
  const tax_cents = Math.round(subtotal_cents * taxRatePercent / 100)
  const total_cents = subtotal_cents + tax_cents
  return { subtotal_cents, tax_cents, total_cents }
}

// ── Schemas ────────────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  appointment_id:  z.string().uuid().nullable().optional(),
  description:     z.string().min(1),
  quantity:        z.number().int().min(1).default(1),
  unit_price_cents: z.number().int().min(0),
})

const CreateInvoiceSchema = z.object({
  client_id:   z.string().uuid(),
  issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:       z.string().nullable().optional(),
  line_items:  z.array(LineItemSchema).min(1),
})

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const statusFilter   = searchParams.get('status')
  const clientIdFilter = searchParams.get('client_id')

  let query = supabase
    .from('invoices')
    .select(`
      *,
      clients ( id, name, email, phone, address ),
      invoice_line_items ( id, appointment_id, description, quantity, unit_price_cents, total_cents )
    `)
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)
  if (clientIdFilter) query = query.eq('client_id', clientIdFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data })
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateInvoiceSchema.safeParse(body)
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

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile / Org not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.org_id

  // Plan gate: invoicing requires a paid plan
  const planAccess = await getOrgPlanAccess(orgId, supabase)
  if (planAccess.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  }
  if (planAccess.plan === 'trial') {
    return NextResponse.json(
      { error: 'Invoicing requires a paid plan. Upgrade to Starter or above.', upgradeRequired: true },
      { status: 403 }
    )
  }

  const d = parsed.data

  // Fetch org tax rate and atomically increment invoice number
  const serviceClient = await createClient(true)  // service role for the increment

  const { data: org } = await serviceClient
    .from('organizations')
    .select('tax_rate_percent, next_invoice_number')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const invoiceNumber = formatInvoiceNumber(org.next_invoice_number)

  // Increment the counter atomically
  await serviceClient
    .from('organizations')
    .update({ next_invoice_number: org.next_invoice_number + 1 })
    .eq('id', orgId)

  // Compute totals
  const { subtotal_cents, tax_cents, total_cents } = computeTotals(
    d.line_items,
    org.tax_rate_percent ?? 0
  )

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      org_id:         orgId,
      client_id:      d.client_id,
      invoice_number: invoiceNumber,
      issued_date:    d.issued_date,
      due_date:       d.due_date,
      notes:          d.notes ?? null,
      subtotal_cents,
      tax_cents,
      total_cents,
    })
    .select()
    .single()

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  // Insert line items
  const lineItemRows = d.line_items.map(li => ({
    invoice_id:       invoice.id,
    appointment_id:   li.appointment_id ?? null,
    description:      li.description,
    quantity:         li.quantity,
    unit_price_cents: li.unit_price_cents,
    total_cents:      li.quantity * li.unit_price_cents,
  }))

  const { error: liError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemRows)

  if (liError) return NextResponse.json({ error: liError.message }, { status: 500 })

  return NextResponse.json({ invoice }, { status: 201 })
}
