'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart2, TrendingUp, CheckCircle2, MessageSquare,
  Users, Wrench, ArrowLeft, Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
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
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'amber' | 'purple'
}) {
  const colors = {
    blue:   { bg: 'rgba(249,115,22,0.12)',  text: '#fdba74', border: 'rgba(249,115,22,0.28)'  },
    green:  { bg: 'rgba(253,186,116,0.12)', text: '#fdba74', border: 'rgba(253,186,116,0.28)' },
    amber:  { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', border: 'rgba(245,158,11,0.28)'  },
    purple: { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.28)'  },
  }
  const c = colors[color]
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
    >
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
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const recent = data.slice(-14)  // show last 14 days for readability

  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {recent.map(({ date, count }) => {
        const pct = (count / max) * 100
        const d = new Date(date + 'T00:00:00')
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div
            key={date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${label}: ${count} job${count !== 1 ? 's' : ''}`}
          >
            <div className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: count > 0
                  ? 'linear-gradient(to top, #1d4ed8, #3b82f6)'
                  : 'rgba(255,255,255,0.06)',
                minHeight: '4px',
              }}
            />
            {/* Tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap shadow-lg z-10 border border-white/10">
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

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load analytics')
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
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
        <button onClick={() => router.push('/dashboard')} className="text-orange-300 text-sm hover:underline">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const totalStatuses = Object.values(data.statuses).reduce((s, n) => s + n, 0)

  return (
    <div className="min-h-screen" style={{ background: '#111318' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4 border-b"
        style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2 ml-2">
          <BarChart2 className="w-5 h-5 text-orange-300" />
          <h1 className="text-white font-semibold text-lg">Analytics</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Summary cards ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={BarChart2}    label="Total Jobs"        value={data.total}              sub="All time"                  color="blue"   />
            <StatCard icon={TrendingUp}   label="This Month"        value={data.thisMonth}          sub="Scheduled this month"      color="purple" />
            <StatCard icon={CheckCircle2} label="Completed"         value={`${data.completionRate}%`} sub="Completion rate"           color="green"  />
            <StatCard icon={MessageSquare} label="SMS Sent"         value={data.smsCount}           sub="Total messages"            color="amber"  />
          </div>
        </section>

        {/* ── Trend + Rates ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 30-day trend */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
          >
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

          {/* Rates */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Performance Rates</h3>
            </div>
            <RateBar label="Completion rate"    value={data.completionRate}   color="#22c55e" />
            <RateBar label="Confirmation rate"  value={data.confirmationRate} color="#3b82f6" />
            <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] text-slate-600">
                Confirmation rate = customers who replied &apos;1&apos; after receiving a reminder
              </p>
            </div>
          </div>
        </div>

        {/* ── Status breakdown + Service breakdown ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Status breakdown */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
          >
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

          {/* Service breakdown */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
          >
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
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: 'linear-gradient(to right, #1d4ed8, #60a5fa)' }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-white w-6 text-right shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Technician leaderboard ────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
        >
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
                <tbody className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'rgba(255,255,255,0.04)' } as React.CSSProperties}>
                  {data.byTechnician.map(({ name, total, completed }) => {
                    const rate = total ? Math.round((completed / total) * 100) : 0
                    return (
                      <tr key={name}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-200">
                              {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
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

      </main>
    </div>
  )
}
