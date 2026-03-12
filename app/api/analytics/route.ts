import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  // ── Fetch all appointments for this org ──────────────────────────────────
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, status, service, scheduled_at, created_at,
      technicians ( id, name )
    `)
    .eq('org_id', orgId)
    .order('scheduled_at', { ascending: true })

  // ── Fetch SMS count ───────────────────────────────────────────────────────
  const { count: smsCount } = await supabase
    .from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .in(
      'appointment_id',
      (appointments ?? []).map(a => a.id)
    )

  const appts = appointments ?? []
  const now = new Date()

  // Time windows
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const inWindow = (iso: string, from: Date) => new Date(iso) >= from

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

  // ── Service breakdown ─────────────────────────────────────────────────────
  const byService: Record<string, number> = {}
  for (const a of appts) {
    byService[a.service] = (byService[a.service] ?? 0) + 1
  }

  // ── Technician breakdown ──────────────────────────────────────────────────
  const byTech: Record<string, { name: string; total: number; completed: number }> = {}
  for (const a of appts) {
    const tech = (a.technicians as unknown as { id: string; name: string } | null)
    if (!tech) continue
    if (!byTech[tech.id]) byTech[tech.id] = { name: tech.name, total: 0, completed: 0 }
    byTech[tech.id].total++
    if (a.status === 'completed') byTech[tech.id].completed++
  }

  // ── 30-day daily trend ────────────────────────────────────────────────────
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

  return NextResponse.json({
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
  })
}
