/**
 * GET /api/appointments/[id]/profitability
 * Returns revenue, total cost, gross profit, and margin % for an appointment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id: appointmentId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch appointment (RLS ensures it belongs to the user's org)
  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .select('id, price_cents, org_id')
    .eq('id', appointmentId)
    .single()

  if (apptError || !appt) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  // Prefer invoice total if an invoice exists for this appointment
  const { data: invoicedLineItem } = await supabase
    .from('invoice_line_items')
    .select('invoices ( total_cents, status )')
    .eq('appointment_id', appointmentId)
    .in('invoices.status', ['sent', 'paid'])
    .limit(1)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceTotal = (invoicedLineItem as any)?.invoices?.total_cents ?? null
  const revenue_cents: number = invoiceTotal ?? appt.price_cents ?? 0

  // Sum all cost items for this appointment
  const { data: costItems, error: costError } = await supabase
    .from('job_cost_items')
    .select('total_cost_cents, category')
    .eq('appointment_id', appointmentId)

  if (costError) return NextResponse.json({ error: costError.message }, { status: 500 })

  const cost_cents = (costItems ?? []).reduce(
    (sum, item) => sum + (item.total_cost_cents ?? 0),
    0
  )

  // Breakdown by category
  const breakdown: Record<string, number> = {}
  for (const item of costItems ?? []) {
    breakdown[item.category] = (breakdown[item.category] ?? 0) + item.total_cost_cents
  }

  const gross_profit_cents = revenue_cents - cost_cents
  const margin_percent = revenue_cents > 0
    ? Math.round((gross_profit_cents / revenue_cents) * 10000) / 100
    : 0

  return NextResponse.json({
    appointment_id: appointmentId,
    revenue_cents,
    cost_cents,
    gross_profit_cents,
    margin_percent,
    cost_breakdown: breakdown,
  })
}
