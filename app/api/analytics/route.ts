import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const orgId = profile.org_id

  // ── Date range from query params (for revenue filtering) ─────────────────
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')

  const now = new Date()
  const revenueFrom = fromParam ? new Date(fromParam + 'T00:00:00.000Z') : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const revenueTo   = toParam   ? new Date(toParam   + 'T23:59:59.999Z') : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))

  // ── Fetch all appointments for this org ──────────────────────────────────
  const { data: appointments, error: apptQueryError } = await supabase
    .from('appointments')
    .select(`
      id, status, service, scheduled_at, created_at, price_cents,
      technicians ( id, name, commission_percent )
    `)
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: true })

  if (apptQueryError) {
    console.error('[Analytics] appointments query error:', JSON.stringify(apptQueryError))
  }

  // ── Fetch services to map name → price_cents ─────────────────────────────
  const { data: services } = await supabase
    .from('services')
    .select('name, price_cents')
    .eq('org_id', orgId)

  // Only include services that actually have a price set (> 0 cents)
  const servicePriceMap: Record<string, number> = {}
  for (const s of services ?? []) {
    if (typeof s.price_cents === 'number' && s.price_cents > 0) {
      servicePriceMap[s.name] = s.price_cents
    }
  }

  // ── Fetch org for tax rate ────────────────────────────────────────────────
  const { data: org } = await supabase
    .from('organizations')
    .select('tax_rate_percent')
    .eq('id', orgId)
    .single()

  const taxRatePercent = Number(org?.tax_rate_percent ?? 0)

  // ── Fetch SMS count ───────────────────────────────────────────────────────
  const { count: smsCount } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .in(
      'appointment_id',
      (appointments ?? []).map(a => a.id)
    )

  const appts = appointments ?? []

  // Time windows (for existing analytics)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const inWindow = (iso: string, from: Date, to?: Date) => {
    const d = new Date(iso)
    return d >= from && (!to || d <= to)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const total     = appts.length
  const thisWeek  = appts.filter(a => inWindow(a.scheduled_at, startOfWeek)).length
  const thisMonth = appts.filter(a => inWindow(a.scheduled_at, startOfMonth)).length

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statuses: Record<string, number> = {}
  for (const a of appts) {
    statuses[a.status] = (statuses[a.status] ?? 0) + 1
  }

  // ── Rates ─────────────────────────────────────────────────────────────────
  const nonCancelled = appts.filter(a => a.status !== 'cancelled')
  const completed    = statuses['completed'] ?? 0
  const confirmed    = (statuses['confirmed'] ?? 0) + completed
  const reminders    = appts.filter(a => ['reminder_sent','confirmed','completed','at_risk'].includes(a.status)).length
  const completionRate   = nonCancelled.length ? Math.round((completed / nonCancelled.length) * 100) : 0
  const confirmationRate = reminders ? Math.round((confirmed / reminders) * 100) : 0

  // ── Service breakdown (by count) ──────────────────────────────────────────
  const byService: Record<string, number> = {}
  for (const a of appts) {
    byService[a.service] = (byService[a.service] ?? 0) + 1
  }

  // ── Revenue-filtered appointments (completed, within date range) ──────────
  const revenueAppts = appts.filter(
    a => a.status === 'completed' && inWindow(a.scheduled_at, revenueFrom, revenueTo)
  )

  // ── Total revenue ─────────────────────────────────────────────────────────
  let totalRevenueCents = 0
  for (const a of revenueAppts) {
    totalRevenueCents += (a as unknown as { price_cents: number | null }).price_cents ?? servicePriceMap[a.service] ?? 0
  }

  const taxOwedCents = Math.round(totalRevenueCents * taxRatePercent / 100)

  // ── Technician breakdown (all time for leaderboard) ───────────────────────
  const byTech: Record<string, { name: string; total: number; completed: number }> = {}
  for (const a of appts) {
    const tech = (a.technicians as unknown as { id: string; name: string; commission_percent: number } | null)
    if (!tech) continue
    if (!byTech[tech.id]) byTech[tech.id] = { name: tech.name, total: 0, completed: 0 }
    byTech[tech.id].total++
    if (a.status === 'completed') byTech[tech.id].completed++
  }

  // ── Technician revenue (date-range filtered) ──────────────────────────────
  const byTechRevenue: Record<string, {
    id: string; name: string; completed: number
    revenueCents: number; commissionPercent: number; commissionCents: number
  }> = {}

  for (const a of revenueAppts) {
    const tech = (a.technicians as unknown as { id: string; name: string; commission_percent: number } | null)
    if (!tech) continue
    if (!byTechRevenue[tech.id]) {
      byTechRevenue[tech.id] = {
        id: tech.id,
        name: tech.name,
        completed: 0,
        revenueCents: 0,
        commissionPercent: Number(tech.commission_percent ?? 0),
        commissionCents: 0,
      }
    }
    const price = (a as unknown as { price_cents: number | null }).price_cents ?? servicePriceMap[a.service] ?? 0
    byTechRevenue[tech.id].completed++
    byTechRevenue[tech.id].revenueCents += price
    byTechRevenue[tech.id].commissionCents += Math.round(price * Number(tech.commission_percent ?? 0) / 100)
  }

  // ── Service revenue (date-range filtered) ─────────────────────────────────
  // Only include services that have a configured price OR an explicit appointment price
  const byServiceRevenue: Record<string, { service: string; completed: number; revenueCents: number }> = {}
  for (const a of revenueAppts) {
    const apptPrice = (a as unknown as { price_cents: number | null }).price_cents
    const svcPrice  = servicePriceMap[a.service]
    // Skip appointments with no pricing data (avoids polluting the list with unknown services)
    if (apptPrice === null && svcPrice === undefined) continue
    const price = apptPrice ?? svcPrice ?? 0
    if (!byServiceRevenue[a.service]) {
      byServiceRevenue[a.service] = { service: a.service, completed: 0, revenueCents: 0 }
    }
    byServiceRevenue[a.service].completed++
    byServiceRevenue[a.service].revenueCents += price
  }

  // ── 30-day daily trend (job counts) ───────────────────────────────────────
  const dailyMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    dailyMap[key] = 0
  }
  for (const a of appts.filter(a => inWindow(a.scheduled_at, startOf30Days))) {
    const d = new Date(a.scheduled_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (key in dailyMap) dailyMap[key]++
  }

  const payload = {
    // Existing analytics fields
    total,
    thisWeek,
    thisMonth,
    statuses,
    completionRate,
    confirmationRate,
    smsCount: smsCount ?? 0,
    byService: Object.entries(byService)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count),
    byTechnician: Object.values(byTech)
      .sort((a, b) => b.total - a.total),
    dailyTrend: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
    // Revenue / accounting fields
    completedJobsInRange: revenueAppts.length,
    totalRevenueCents,
    taxRatePercent,
    taxOwedCents,
    byTechnicianRevenue: Object.values(byTechRevenue)
      .sort((a, b) => b.revenueCents - a.revenueCents),
    byServiceRevenue: Object.values(byServiceRevenue)
      .sort((a, b) => b.revenueCents - a.revenueCents),
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
