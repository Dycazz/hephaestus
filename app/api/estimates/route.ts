/**
 * GET  /api/estimates  — List estimates for the current org
 * POST /api/estimates  — Create a new draft estimate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrgPlanAccess } from '@/lib/plan-access'
import { generateEstimateToken } from '@/lib/estimate-token'

export const dynamic = 'force-dynamic'

function formatEstimateNumber(n: number): string {
  return `EST-${String(n).padStart(3, '0')}`
}

const LineItemSchema = z.object({
  appointment_id:   z.string().uuid().nullable().optional(),
  description:      z.string().min(1),
  quantity:         z.number().int().min(1).default(1),
  unit_price_cents: z.number().int().min(0),
  tax_exempt:       z.boolean().optional().default(false),
  sort_order:       z.number().int().optional().default(0),
})

const CreateEstimateSchema = z.object({
  client_id:    z.string().uuid(),
  title:        z.string().nullable().optional(),
  issued_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:        z.string().nullable().optional(),
  line_items:   z.array(LineItemSchema).min(1),
  tax_rate_ids: z.array(z.string().uuid()).optional().default([]),
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
    .from('estimates')
    .select(`
      *,
      clients ( id, name, email, phone, address ),
      estimate_line_items ( id, description, quantity, unit_price_cents, total_cents, sort_order, tax_exempt )
    `)
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)
  if (clientIdFilter) query = query.eq('client_id', clientIdFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ estimates: data })
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateEstimateSchema.safeParse(body)
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
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.org_id

  // Plan gate: estimates require a paid plan
  const planAccess = await getOrgPlanAccess(orgId, supabase)
  if (planAccess.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
  }
  if (planAccess.plan === 'trial') {
    return NextResponse.json(
      { error: 'Estimates require a paid plan.', upgradeRequired: true },
      { status: 403 }
    )
  }

  const d = parsed.data

  // Atomically increment estimate number using service role
  const serviceClient = await createClient(true)
  const { data: org } = await serviceClient
    .from('organizations')
    .select('next_estimate_number')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const estimateNumber = formatEstimateNumber(org.next_estimate_number)
  await serviceClient
    .from('organizations')
    .update({ next_estimate_number: org.next_estimate_number + 1 })
    .eq('id', orgId)

  // Fetch selected tax rates
  let taxRates: { id: string; name: string; rate_percent: number }[] = []
  if (d.tax_rate_ids.length > 0) {
    const { data: rates } = await supabase
      .from('tax_rates')
      .select('id, name, rate_percent')
      .in('id', d.tax_rate_ids)
    taxRates = rates ?? []
  }

  // Compute totals
  const subtotal_cents = d.line_items.reduce(
    (sum, li) => sum + li.quantity * li.unit_price_cents,
    0
  )
  const taxableSubtotal = d.line_items
    .filter(li => !li.tax_exempt)
    .reduce((sum, li) => sum + li.quantity * li.unit_price_cents, 0)

  const taxBreakdown = taxRates.map(r => ({
    tax_rate_id: r.id,
    name: r.name,
    rate_percent: r.rate_percent,
    tax_cents: Math.round(taxableSubtotal * r.rate_percent / 100),
  }))
  const tax_cents = taxBreakdown.reduce((s, t) => s + t.tax_cents, 0)
  const total_cents = subtotal_cents + tax_cents

  // Generate HMAC public token
  // We need the estimate ID first — generate a temporary UUID for token
  const estimateId = crypto.randomUUID()
  const publicToken = await generateEstimateToken(estimateId)

  // Insert estimate with explicit ID
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      id:              estimateId,
      org_id:          orgId,
      client_id:       d.client_id,
      estimate_number: estimateNumber,
      title:           d.title ?? null,
      issued_date:     d.issued_date,
      expiry_date:     d.expiry_date ?? null,
      notes:           d.notes ?? null,
      subtotal_cents,
      tax_cents,
      total_cents,
      public_token:    publicToken,
    })
    .select()
    .single()

  if (estimateError) return NextResponse.json({ error: estimateError.message }, { status: 500 })

  // Insert line items
  const lineItemRows = d.line_items.map((li, i) => ({
    estimate_id:      estimate.id,
    appointment_id:   li.appointment_id ?? null,
    description:      li.description,
    quantity:         li.quantity,
    unit_price_cents: li.unit_price_cents,
    total_cents:      li.quantity * li.unit_price_cents,
    tax_exempt:       li.tax_exempt,
    sort_order:       li.sort_order ?? i,
  }))

  const { error: liError } = await supabase
    .from('estimate_line_items')
    .insert(lineItemRows)

  if (liError) return NextResponse.json({ error: liError.message }, { status: 500 })

  // Insert estimate_taxes rows
  if (taxBreakdown.length > 0) {
    await supabase.from('estimate_taxes').insert(
      taxBreakdown.map(t => ({
        estimate_id:  estimate.id,
        tax_rate_id:  t.tax_rate_id,
        name:         t.name,
        rate_percent: t.rate_percent,
        tax_cents:    t.tax_cents,
      }))
    )
  }

  return NextResponse.json({ estimate }, { status: 201 })
}
