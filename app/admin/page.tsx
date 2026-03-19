'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, ChevronRight, Wifi, WifiOff, Trash2, ShieldOff } from 'lucide-react'

interface OrgRow {
  id: string
  name: string
  slug: string
  business_name: string | null
  plan: string
  trial_ends_at: string | null
  suspended_at: string | null
  sms_phone_number: string | null
  created_at: string
  member_count: number
  appt_count_total: number
  appt_count_30d: number
  has_sms: boolean
}

const PLAN_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  trial:      { label: 'Trial',      bg: 'rgba(255,255,255,0.08)', text: '#cbd5f5', border: 'rgba(255,255,255,0.18)' },
  starter:    { label: 'Starter',    bg: 'rgba(249,115,22,0.15)',  text: '#fdba74', border: 'rgba(249,115,22,0.3)' },
  pro:        { label: 'Pro',        bg: 'rgba(251,146,60,0.15)',  text: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  enterprise: { label: 'Enterprise', bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  gifted:     { label: 'Gifted',     bg: 'rgba(168,85,247,0.15)',  text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
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

const FILTERS = ['all', 'trial', 'expired', 'starter', 'pro', 'enterprise', 'gifted', 'suspended'] as const
type Filter = typeof FILTERS[number]

function trialRemaining(iso: string) {
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} left`
  if (diffDays === 0) return 'Ends today'
  return `Expired (${Math.abs(diffDays)}d ago)`
}

export default function AdminOrgsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [stats, setStats] = useState<{ totalOrgs: number; activeTrials: number; totalMembers: number; recentAppts: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/orgs')
    if (res.ok) {
      const json = await res.json()
      setOrgs(json.orgs ?? [])
    }
    setLoading(false)
  }

  const loadStats = async () => {
    const res = await fetch('/api/admin/orgs/stats')
    if (res.ok) {
      setStats(await res.json())
    }
  }

  useEffect(() => { load(); loadStats(); }, [])

  const filtered = useMemo(() => {
    let list = orgs
    if (filter === 'suspended') list = list.filter(o => !!o.suspended_at)
    else if (filter === 'expired') list = list.filter(o =>
      o.plan === 'trial' && !!o.trial_ends_at && new Date(o.trial_ends_at) < new Date()
    )
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

  const bulkSuspend = async () => {
    setBulkLoading(true)
    const now = new Date().toISOString()
    for (const org of filtered) {
      if (!org.suspended_at) {
        await fetch(`/api/admin/orgs/${org.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suspended_at: now }),
        })
      }
    }
    setBulkLoading(false)
    load()
  }

  const bulkDelete = async () => {
    setBulkLoading(true)
    for (const org of filtered) {
      await fetch(`/api/admin/orgs/${org.id}`, { method: 'DELETE' })
    }
    setBulkLoading(false)
    setBulkConfirm(false)
    load()
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

      {/* Global Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl p-4" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-slate-500 mb-1">Total Organizations</p>
            <p className="text-2xl font-bold text-white">{stats.totalOrgs}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-slate-500 mb-1">Active Trials</p>
            <p className="text-2xl font-bold text-amber-400">{stats.activeTrials}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-slate-500 mb-1">Total Members</p>
            <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-slate-500 mb-1">Appointments (30d)</p>
            <p className="text-2xl font-bold text-white">{stats.recentAppts}</p>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className="w-full pl-8 pr-3 py-2 text-sm text-white rounded-lg outline-none focus:ring-1 focus:ring-orange-400"
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
                  ? 'bg-orange-500 text-black'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={filter !== f ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar — shown when expired filter is active */}
      {filter === 'expired' && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="text-sm text-red-400 font-semibold flex-1">
            {filtered.length} expired trial account{filtered.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={bulkSuspend}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <ShieldOff className="w-3.5 h-3.5" />
            Suspend All
          </button>
          {bulkConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete {filtered.length} orgs?</span>
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={bulkLoading}
                className="px-2 py-1 text-xs text-slate-400 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.5)' }}
              >
                <Trash2 className="w-3 h-3" />
                {bulkLoading ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 transition-colors disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Organization', 'Plan', 'Trial ends', 'Members', 'Appts (30d)', 'SMS', 'Created', ''].map(h => (
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
                    <option value="gifted">Gifted</option>
                  </select>
                </td>

                {/* Trial ends */}
                <td className="px-4 py-3 text-xs">
                  {org.trial_ends_at ? (
                    <div className="flex flex-col">
                      <span className="text-slate-300">{shortDate(org.trial_ends_at)}</span>
                      {org.plan === 'trial' && (
                        <span className={`mt-0.5 ${new Date(org.trial_ends_at) < new Date() ? 'text-red-400 font-semibold' : 'text-amber-400'}`}>
                          {trialRemaining(org.trial_ends_at)}
                        </span>
                      )}
                    </div>
                  ) : <span className="text-slate-600">—</span>}
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

                {/* SMS */}
                <td className="px-4 py-3">
                  {org.has_sms
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
