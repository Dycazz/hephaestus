'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign, TrendingUp, CheckCircle2, MessageSquare,
  Users, Wrench, ArrowLeft, Loader2, BarChart2,
  Percent, RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  // Existing
  total: number
  thisWeek: number
  thisMonth: number
  statuses: Record<string, number>
  completionRate: number
  confirmationRate: number
  smsCount: number
  byService: { service: string; count: number }[]
  byTechnician: { name: string; total: number; completed: number }[]
  dailyTrend: { date: string; count: number }[]
  // Revenue
  completedJobsInRange: number
  totalRevenueCents: number
  projectedRevenueCents: number
  taxRatePercent: number
  taxOwedCents: number
  byTechnicianRevenue: {
    id: string; name: string; completed: number
    revenueCents: number; commissionPercent: number; commissionCents: number
  }[]
  byServiceRevenue: { service: string; completed: number; revenueCents: number }[]
}

type DateRange = 'month' | 'year' | 'custom'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = 'blue',
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red'
}) {
  const colors = {
    blue:   { bg: 'rgba(249,115,22,0.12)',  text: '#fdba74', border: 'rgba(249,115,22,0.28)'  },
    green:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.28)'   },
    amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.28)'  },
    purple: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc', border: 'rgba(168,85,247,0.28)'  },
    red:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.28)'   },
  }
  const c = colors[color]
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
        <Icon className="w-5 h-5" style={{ color: c.text }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const recent = data.slice(-14)
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {recent.map(({ date, count }) => {
        const pct = (count / max) * 100
        const d = new Date(date + 'T00:00:00')
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${label}: ${count}`}>
            <div className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: count > 0 ? 'linear-gradient(to top, #1d4ed8, #3b82f6)' : 'rgba(255,255,255,0.06)',
                minHeight: '4px',
              }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-lg z-10 border border-white/10">
              {label}: {count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled:     { label: 'Scheduled',    color: '#64748b' },
  reminder_sent: { label: 'Pending',      color: '#f59e0b' },
  confirmed:     { label: 'Confirmed',    color: '#22c55e' },
  at_risk:       { label: 'At Risk',      color: '#ef4444' },
  rescheduling:  { label: 'Rescheduling', color: '#a855f7' },
  completed:     { label: 'Completed',    color: '#3b82f6' },
  cancelled:     { label: 'Cancelled',    color: '#374151' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const router = useRouter()

  // Analytics / revenue data
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range
  const [range, setRange] = useState<DateRange>('month')
  const now = new Date()
  const [customFrom, setCustomFrom] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customTo,   setCustomTo]   = useState(toDateStr(now))

  // ── Date range helpers ──────────────────────────────────────────────────
  const getFromTo = useCallback(() => {
    if (range === 'month') {
      return {
        from: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        to:   toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    }
    if (range === 'year') {
      return {
        from: toDateStr(new Date(now.getFullYear(), 0, 1)),
        to:   toDateStr(new Date(now.getFullYear(), 11, 31)),
      }
    }
    return { from: customFrom, to: customTo }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo])

  // ── Fetch analytics ─────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(() => {
    const { from, to } = getFromTo()
    setLoading(true)
    fetch(`/api/analytics?from=${from}&to=${to}&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [getFromTo])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  // ── Auto-refresh every 30 seconds ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => { fetchAnalytics() }, 30_000)
    return () => clearInterval(id)
  }, [fetchAnalytics])

  // ── Real-time: refetch immediately when any appointment changes ──────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('analytics-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAnalytics()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAnalytics])

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#111318' }}>
        <Loader2 className="w-8 h-8 text-orange-400/70 animate-spin" />
        <p className="text-orange-200/50 text-sm font-medium tracking-wide">Crunching numbers…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#111318' }}>
        <p className="text-red-400 text-sm">{error ?? 'Something went wrong'}</p>
        <button onClick={() => router.push('/dashboard')} className="text-orange-300 text-sm hover:underline">← Back to dashboard</button>
      </div>
    )
  }

  const totalStatuses = Object.values(data.statuses).reduce((s, n) => s + n, 0)
  const { from: rangeFrom, to: rangeTo } = getFromTo()

  return (
    <div className="min-h-screen" style={{ background: '#111318' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 px-6 py-4 border-b" style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2 ml-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h1 className="text-white font-semibold text-lg">Accounting</h1>
          <button
            onClick={() => { fetchAnalytics() }}
            title="Refresh now"
            className="ml-1 text-slate-600 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-green-400' : ''}`} />
          </button>
        </div>

        {/* Date range selector */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {(['month', 'year', 'custom'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: range === r ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                color:      range === r ? '#4ade80' : '#64748b',
                border:     `1px solid ${range === r ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {r === 'month' ? 'This Month' : r === 'year' ? 'This Year' : 'Custom'}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 text-white border"
                style={{ background: '#1a1d26', borderColor: 'rgba(255,255,255,0.12)' }} />
              <span className="text-slate-600 text-xs">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 text-white border"
                style={{ background: '#1a1d26', borderColor: 'rgba(255,255,255,0.12)' }} />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ══════════════════════════════════════════════════════════════════
            ACCOUNTING SECTIONS
        ══════════════════════════════════════════════════════════════════ */}

        {/* ── Revenue Summary cards ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">Revenue Summary</h2>

          {/* No-price warning: completed jobs exist but revenue = $0 */}
          {data.completedJobsInRange > 0 && data.totalRevenueCents === 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
              <p className="text-amber-300/80 text-xs leading-relaxed">
                <span className="font-semibold text-amber-300">{data.completedJobsInRange} completed job{data.completedJobsInRange !== 1 ? 's' : ''} found</span>
                {' '}but no revenue is being calculated. Make sure your services have prices set in{' '}
                <a href="/settings" className="underline hover:text-amber-200 transition-colors">Settings → Services</a>,
                or set a Job Price when creating appointments.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={DollarSign} label="Gross Revenue" value={fmt(data.totalRevenueCents)} sub={`${fmt(data.projectedRevenueCents)} projected`} color="green" />
            <StatCard icon={Percent}    label="Tax Owed"      value={fmt(data.taxOwedCents)}      sub={`${data.taxRatePercent}% rate`}                color="purple" />
          </div>
        </section>

        {/* ── Technician Revenue ─────────────────────────────────────────── */}
        <section>
          <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-purple-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Technician Revenue</h3>
              <span className="ml-auto text-[10px] text-slate-600">{rangeFrom} – {rangeTo}</span>
            </div>
            {data.byTechnicianRevenue.length === 0 ? (
              <p className="text-sm text-slate-600">No completed jobs in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left text-xs font-semibold text-slate-600 pb-2.5 pr-4">Technician</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 px-4">Jobs Done</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 px-4">Revenue</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 px-4">Commission %</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 pl-4">Commission $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTechnicianRevenue.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-200">
                              {t.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <span className="text-white/80 font-medium text-xs">{t.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-semibold text-xs">{t.completed}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-semibold text-xs">{fmt(t.revenueCents)}</td>
                        <td className="py-3 px-4 text-right text-slate-400 text-xs">
                          {t.commissionPercent}%
                        </td>
                        <td className="py-3 pl-4 text-right text-amber-400 font-semibold text-xs">{fmt(t.commissionCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Service Revenue ────────────────────────────────────────────── */}
        <section>
          <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-4 h-4 text-amber-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Revenue by Service</h3>
            </div>
            {data.byServiceRevenue.length === 0 ? (
              <p className="text-sm text-slate-600">No completed jobs in this period</p>
            ) : (
              <div className="space-y-3">
                {data.byServiceRevenue.map(s => {
                  const maxRev = Math.max(...data.byServiceRevenue.map(x => x.revenueCents), 1)
                  const pct = (s.revenueCents / maxRev) * 100
                  return (
                    <div key={s.service} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{s.service}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(to right, #16a34a, #4ade80)' }} />
                      </div>
                      <span className="text-xs text-green-400 font-semibold w-20 text-right shrink-0">{fmt(s.revenueCents)}</span>
                      <span className="text-[10px] text-slate-600 w-16 text-right shrink-0">{s.completed} job{s.completed !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════════
            EXISTING ANALYTICS SECTIONS (retained)
        ══════════════════════════════════════════════════════════════════ */}

        <div className="border-t pt-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-6">Operations Analytics</h2>

          {/* Overview stat cards */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart2}     label="Total Jobs"    value={data.total}                  sub="All time"             color="blue"   />
              <StatCard icon={TrendingUp}    label="This Month"    value={data.thisMonth}              sub="Scheduled this month" color="purple" />
              <StatCard icon={CheckCircle2}  label="Completed"     value={`${data.completionRate}%`}   sub="Completion rate"      color="green"  />
              <StatCard icon={MessageSquare} label="SMS Sent"      value={data.smsCount}               sub="Total messages"       color="amber"  />
            </div>
          </section>

          {/* Trend + Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-orange-300/80" />
                <h3 className="text-sm font-semibold text-white/90">Jobs — Last 14 Days</h3>
              </div>
              {data.dailyTrend.every(d => d.count === 0) ? (
                <div className="flex items-center justify-center h-24 text-slate-600 text-sm">No jobs yet</div>
              ) : (
                <MiniBarChart data={data.dailyTrend} />
              )}
            </div>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400/70" />
                <h3 className="text-sm font-semibold text-white/90">Performance Rates</h3>
              </div>
              <RateBar label="Completion rate"   value={data.completionRate}   color="#22c55e" />
              <RateBar label="Confirmation rate" value={data.confirmationRate} color="#3b82f6" />
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] text-slate-600">
                  Confirmation rate = customers who replied &apos;1&apos; after receiving a reminder
                </p>
              </div>
            </div>
          </div>

          {/* Status + Service breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold text-white/90 mb-4">Job Status Breakdown</h3>
              {totalStatuses === 0 ? (
                <p className="text-sm text-slate-600">No data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(data.statuses)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => {
                      const cfg = STATUS_LABELS[status] ?? { label: status, color: '#6b7280' }
                      const pct = Math.round((count / totalStatuses) * 100)
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                              <span className="text-xs text-slate-400">{cfg.label}</span>
                            </div>
                            <span className="text-xs font-semibold text-white">{count} <span className="text-slate-600 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-4 h-4 text-amber-400/70" />
                <h3 className="text-sm font-semibold text-white/90">Jobs by Service</h3>
              </div>
              {data.byService.length === 0 ? (
                <p className="text-sm text-slate-600">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {data.byService.map(({ service, count }) => {
                    const pct = Math.round((count / data.total) * 100)
                    return (
                      <div key={service} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-24 shrink-0 truncate">{service}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(to right, #1d4ed8, #60a5fa)' }} />
                        </div>
                        <span className="text-xs font-semibold text-white w-6 text-right shrink-0">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Technician leaderboard */}
          <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-purple-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Technician Performance</h3>
            </div>
            {data.byTechnician.length === 0 ? (
              <p className="text-sm text-slate-600">No technician data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left text-xs font-semibold text-slate-600 pb-2.5 pr-4">Technician</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 px-4">Total Jobs</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 px-4">Completed</th>
                      <th className="text-right text-xs font-semibold text-slate-600 pb-2.5 pl-4">Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTechnician.map(({ name, total, completed }) => {
                      const rate = total ? Math.round((completed / total) * 100) : 0
                      return (
                        <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-200">
                                {name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                              <span className="text-white/80 font-medium text-xs">{name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-white font-semibold text-xs">{total}</td>
                          <td className="py-3 px-4 text-right text-slate-400 text-xs">{completed}</td>
                          <td className="py-3 pl-4 text-right">
                            <span className={`text-xs font-bold ${rate >= 70 ? 'text-green-400' : rate >= 40 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
