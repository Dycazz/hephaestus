'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, ChevronRight, Wifi, WifiOff } from 'lucide-react'

interface OrgRow {
  id: string
  name: string
  slug: string
  business_name: string | null
  plan: string
  trial_ends_at: string | null
  suspended_at: string | null
  twilio_phone_number: string | null
  created_at: string
  member_count: number
  appt_count_total: number
  appt_count_30d: number
  has_twilio: boolean
}

const PLAN_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  trial:      { label: 'Trial',      bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  starter:    { label: 'Starter',    bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  pro:        { label: 'Pro',        bg: 'rgba(168,85,247,0.15)',  text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  enterprise: { label: 'Enterprise', bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
}

function PlanBadge({ plan }: { plan: string }) {
  const s = PLAN_STYLES[plan] ?? PLAN_STYLES.trial
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

function relativeDate(iso: string) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

const FILTERS = ['all', 'trial', 'starter', 'pro', 'enterprise', 'suspended'] as const
type Filter = typeof FILTERS[number]

export default function AdminOrgsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/orgs')
    if (res.ok) {
      const json = await res.json()
      setOrgs(json.orgs ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = orgs
    if (filter === 'suspended') list = list.filter(o => !!o.suspended_at)
    else if (filter !== 'all') list = list.filter(o => o.plan === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        (o.business_name ?? o.name).toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q)
      )
    }
    return list
  }, [orgs, filter, search])

  const handlePlanChange = async (orgId: string, plan: string) => {
    setSaving(prev => ({ ...prev, [orgId]: true }))
    await fetch(`/api/admin/orgs/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, plan } : o))
    setSaving(prev => ({ ...prev, [orgId]: false }))
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Organizations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orgs.length} accounts</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className="w-full pl-8 pr-3 py-2 text-sm text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={filter !== f ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Organization', 'Plan', 'Trial ends', 'Members', 'Appts (30d)', 'Twilio', 'Created', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-600 text-sm">
                  No organizations found.
                </td>
              </tr>
            )}
            {filtered.map((org, i) => (
              <tr
                key={org.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                  background: org.suspended_at ? 'rgba(239,68,68,0.04)' : undefined,
                }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                {/* Org name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-white">
                        {org.business_name ?? org.name}
                        {org.suspended_at && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-700/40">
                            SUSPENDED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{org.slug}</p>
                    </div>
                  </div>
                </td>

                {/* Plan — inline changer */}
                <td className="px-4 py-3">
                  <select
                    value={org.plan}
                    onChange={e => handlePlanChange(org.id, e.target.value)}
                    disabled={!!saving[org.id]}
                    className="text-xs rounded-lg px-2 py-1 outline-none disabled:opacity-60 cursor-pointer"
                    style={{
                      background: PLAN_STYLES[org.plan]?.bg ?? 'rgba(100,116,139,0.15)',
                      color: PLAN_STYLES[org.plan]?.text ?? '#94a3b8',
                      border: `1px solid ${PLAN_STYLES[org.plan]?.border ?? 'rgba(100,116,139,0.3)'}`,
                    }}
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>

                {/* Trial ends */}
                <td className="px-4 py-3 text-xs text-slate-400">
                  {org.trial_ends_at ? shortDate(org.trial_ends_at) : <span className="text-slate-600">—</span>}
                </td>

                {/* Members */}
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-white">{org.member_count}</span>
                </td>

                {/* Appts 30d */}
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-white">{org.appt_count_30d}</span>
                  <span className="text-xs text-slate-600 ml-1">/ {org.appt_count_total}</span>
                </td>

                {/* Twilio */}
                <td className="px-4 py-3">
                  {org.has_twilio
                    ? <Wifi className="w-4 h-4 text-green-400" />
                    : <WifiOff className="w-4 h-4 text-slate-600" />
                  }
                </td>

                {/* Created */}
                <td className="px-4 py-3 text-xs text-slate-500">
                  {relativeDate(org.created_at)}
                </td>

                {/* Detail link */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => router.push(`/admin/orgs/${org.id}`)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
