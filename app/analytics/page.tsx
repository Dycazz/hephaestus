'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign, TrendingUp, CheckCircle2, MessageSquare,
  Users, Wrench, ArrowLeft, Loader2, BarChart2,
  Receipt, Minus, Percent, Pencil, Check, X, Trash2, Plus,
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
  totalRevenueCents: number
  taxRatePercent: number
  taxOwedCents: number
  byTechnicianRevenue: {
    id: string; name: string; completed: number
    revenueCents: number; commissionPercent: number; commissionCents: number
  }[]
  byServiceRevenue: { service: string; completed: number; revenueCents: number }[]
}

interface Expense {
  id: string
  name: string
  amount_cents: number
  category: 'supplies' | 'labor' | 'overhead' | 'other'
  expense_date: string
  notes?: string
}

type DateRange = 'month' | 'year' | 'custom'

const CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Supplies',
  labor:    'Labor',
  overhead: 'Overhead',
  other:    'Other',
}

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

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expLoading, setExpLoading] = useState(false)

  // Date range
  const [range, setRange] = useState<DateRange>('month')
  const now = new Date()
  const [customFrom, setCustomFrom] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customTo,   setCustomTo]   = useState(toDateStr(now))

  // Tax rate editing
  const [taxInput, setTaxInput]     = useState('')
  const [taxSaving, setTaxSaving]   = useState(false)

  // Commission editing
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionInput,   setCommissionInput]   = useState('')

  // Add expense form
  const [showExpForm,  setShowExpForm]  = useState(false)
  const [expName,      setExpName]      = useState('')
  const [expAmount,    setExpAmount]    = useState('')
  const [expCategory,  setExpCategory]  = useState<Expense['category']>('other')
  const [expDate,      setExpDate]      = useState(toDateStr(now))
  const [expNotes,     setExpNotes]     = useState('')
  const [expSubmitting, setExpSubmitting] = useState(false)

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
    fetch(`/api/analytics?from=${from}&to=${to}`)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => { setData(d); setTaxInput(String(d.taxRatePercent)) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [getFromTo])

  // ── Fetch expenses ──────────────────────────────────────────────────────
  const fetchExpenses = useCallback(() => {
    const { from, to } = getFromTo()
    setExpLoading(true)
    fetch(`/api/expenses?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => setExpenses(d.expenses ?? []))
      .catch(() => {})
      .finally(() => setExpLoading(false))
  }, [getFromTo])

  useEffect(() => { fetchAnalytics(); fetchExpenses() }, [fetchAnalytics, fetchExpenses])

  // ── Derived accounting figures ──────────────────────────────────────────
  const totalExpensesCents = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const netProfitCents     = (data?.totalRevenueCents ?? 0) - totalExpensesCents

  // ── Tax rate save ───────────────────────────────────────────────────────
  async function saveTaxRate() {
    setTaxSaving(true)
    await fetch('/api/accounting/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxRatePercent: parseFloat(taxInput || '0') }),
    })
    setTaxSaving(false)
    fetchAnalytics()
  }

  // ── Commission save ─────────────────────────────────────────────────────
  async function saveCommission(techId: string) {
    await fetch(`/api/technicians/${techId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_percent: parseFloat(commissionInput || '0') }),
    })
    setEditingCommission(null)
    fetchAnalytics()
  }

  // ── Add expense ─────────────────────────────────────────────────────────
  async function submitExpense() {
    if (!expName.trim() || !expAmount) return
    setExpSubmitting(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: expName.trim(),
        amount_cents: Math.round(parseFloat(expAmount) * 100),
        category: expCategory,
        expense_date: expDate,
        notes: expNotes.trim() || undefined,
      }),
    })
    setExpSubmitting(false)
    if (res.ok) {
      setShowExpForm(false); setExpName(''); setExpAmount(''); setExpNotes('')
      setExpCategory('other'); setExpDate(toDateStr(now))
      fetchExpenses()
    }
  }

  // ── Delete expense ──────────────────────────────────────────────────────
  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchExpenses()
  }

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Gross Revenue"   value={fmt(data.totalRevenueCents)}  sub="Completed jobs"     color="green"  />
            <StatCard icon={Receipt}    label="Total Expenses"  value={fmt(totalExpensesCents)}       sub="Logged expenses"    color="amber"  />
            <StatCard icon={Minus}      label="Net Profit"      value={fmt(netProfitCents)}           sub="Revenue – expenses" color={netProfitCents >= 0 ? 'blue' : 'red'} />
            <StatCard icon={Percent}    label="Tax Owed"        value={fmt(data.taxOwedCents)}        sub={`${data.taxRatePercent}% rate`} color="purple" />
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
                        <td className="py-3 px-4 text-right text-xs">
                          {editingCommission === t.id ? (
                            <span className="flex items-center justify-end gap-1">
                              <input
                                type="number" min="0" max="100" step="0.5"
                                value={commissionInput}
                                onChange={e => setCommissionInput(e.target.value)}
                                className="w-16 text-right rounded px-1.5 py-0.5 text-xs text-white border"
                                style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.2)' }}
                                autoFocus
                              />
                              <span className="text-slate-500">%</span>
                              <button onClick={() => saveCommission(t.id)} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingCommission(null)} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1.5 group">
                              <span className="text-slate-400">{t.commissionPercent}%</span>
                              <button
                                onClick={() => { setEditingCommission(t.id); setCommissionInput(String(t.commissionPercent)) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-300"
                              ><Pencil className="w-3 h-3" /></button>
                            </span>
                          )}
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

        {/* ── Expense Tracker ────────────────────────────────────────────── */}
        <section>
          <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-amber-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Expenses</h3>
              <span className="ml-auto text-xs font-semibold text-amber-400">{fmt(totalExpensesCents)} total</span>
              <button
                onClick={() => setShowExpForm(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.28)' }}
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {/* Add expense form */}
            {showExpForm && (
              <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Description</label>
                    <input value={expName} onChange={e => setExpName(e.target.value)} placeholder="e.g. Cleaning supplies"
                      className="w-full rounded-lg px-3 py-2 text-xs text-white border"
                      style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Amount ($)</label>
                    <input type="number" min="0" step="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00"
                      className="w-full rounded-lg px-3 py-2 text-xs text-white border"
                      style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Category</label>
                    <select value={expCategory} onChange={e => setExpCategory(e.target.value as Expense['category'])}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white border"
                      style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }}>
                      <option value="supplies">Supplies</option>
                      <option value="labor">Labor</option>
                      <option value="overhead">Overhead</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Date</label>
                    <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white border"
                      style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Notes (optional)</label>
                  <input value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder="Optional notes"
                    className="w-full rounded-lg px-3 py-2 text-xs text-white border"
                    style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowExpForm(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button onClick={submitExpense} disabled={expSubmitting || !expName.trim() || !expAmount}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
                    style={{ background: '#16a34a', color: 'white' }}>
                    {expSubmitting ? 'Saving…' : 'Save Expense'}
                  </button>
                </div>
              </div>
            )}

            {/* Expense list */}
            {expLoading ? (
              <p className="text-xs text-slate-600">Loading…</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-slate-600">No expenses logged for this period</p>
            ) : (
              <div className="space-y-1.5">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 py-2 px-3 rounded-xl group hover:bg-white/[0.03] transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white/80 truncate">{e.name}</p>
                      <p className="text-[10px] text-slate-600">{CATEGORY_LABELS[e.category]} · {e.expense_date}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-400 shrink-0">{fmt(e.amount_cents)}</span>
                    <button onClick={() => deleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Accounting Settings ────────────────────────────────────────── */}
        <section>
          <div className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Percent className="w-4 h-4 text-purple-400/70" />
              <h3 className="text-sm font-semibold text-white/90">Accounting Settings</h3>
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1.5">Tax Rate (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={taxInput}
                    onChange={e => setTaxInput(e.target.value)}
                    className="w-24 rounded-lg px-3 py-2 text-sm text-white border"
                    style={{ background: '#111318', borderColor: 'rgba(255,255,255,0.12)' }}
                  />
                  <span className="text-slate-500 text-sm">%</span>
                  <button
                    onClick={saveTaxRate}
                    disabled={taxSaving}
                    className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
                    style={{ background: '#7c3aed', color: 'white' }}
                  >
                    {taxSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">Applied to gross revenue to estimate tax owed</p>
              </div>
            </div>
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
