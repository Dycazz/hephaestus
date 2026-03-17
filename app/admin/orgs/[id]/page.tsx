'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Shield, ShieldOff, Bell, BellOff, ExternalLink,
  User, Calendar, Clock, Loader2, CheckCircle2, XCircle, Trash2,
} from 'lucide-react'

interface OrgDetail {
  id: string
  name: string
  slug: string
  business_name: string | null
  plan: string
  trial_ends_at: string | null
  suspended_at: string | null
  twilio_phone_number: string | null
  review_url: string | null
  created_at: string
}

interface Member {
  id: string
  email: string | null
  full_name: string | null
  role: string
  is_admin: boolean
  expo_push_token: string | null
  created_at: string
}

interface Appointment {
  id: string
  status: string
  service: string
  service_icon: string | null
  scheduled_at: string
  clients: { name: string } | null
  technicians: { name: string } | null
}

const PLAN_COLORS: Record<string, string> = {
  trial: '#cbd5f5', starter: '#f97316', pro: '#fb923c', enterprise: '#f59e0b', gifted: '#facc15',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#f97316', scheduled: '#94a3b8', completed: '#cbd5f5',
  at_risk: '#ef4444', rescheduling: '#fb923c', reminder_sent: '#f59e0b', cancelled: '#6b7280',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  // Trial extension state
  const [trialDate, setTrialDate] = useState('')

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/orgs/${id}`)
    if (res.ok) {
      const json = await res.json()
      setOrg(json.org)
      setMembers(json.members ?? [])
      setAppointments(json.appointments ?? [])
      if (json.org.trial_ends_at) {
        setTrialDate(json.org.trial_ends_at.slice(0, 10))
      }
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const patch = async (updates: Record<string, string | null>, label: string) => {
    if (!org) return
    setSaving(true)
    const res = await fetch(`/api/admin/orgs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const json = await res.json()
      setOrg(prev => prev ? { ...prev, ...json.org } : prev)
      setSaved(label)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(false)
  }

  const handlePlanChange = (plan: string) => patch({ plan }, 'Plan updated')

  const extendTrial = (days: number) => {
    const base = org?.trial_ends_at ? new Date(org.trial_ends_at) : new Date()
    base.setDate(base.getDate() + days)
    const iso = base.toISOString()
    setTrialDate(iso.slice(0, 10))
    patch({ trial_ends_at: iso }, `Trial extended +${days} days`)
  }

  const setTrialManual = () => {
    if (!trialDate) return
    patch({ trial_ends_at: new Date(trialDate).toISOString() }, 'Trial date set')
  }

  const toggleSuspend = () => {
    if (org?.suspended_at) {
      patch({ suspended_at: null }, 'Org unsuspended')
    } else {
      patch({ suspended_at: new Date().toISOString() }, 'Org suspended')
    }
  }

  const deleteOrg = async () => {
    if (!org) return
    setDeleting(true)
    const res = await fetch(`/api/admin/orgs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin')
    } else {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="p-6 text-slate-400">Organization not found.</div>
    )
  }

  const planColor = PLAN_COLORS[org.plan] ?? '#94a3b8'

  return (
    <div className="p-6 max-w-6xl">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/admin')}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{org.business_name ?? org.name}</h1>
          <p className="text-sm text-slate-500">{org.slug} · created {formatDate(org.created_at)}</p>
        </div>
        {org.suspended_at && (
          <span className="ml-2 text-xs font-bold px-2 py-1 rounded-lg bg-red-900/40 text-red-400 border border-red-700/40">
            SUSPENDED
          </span>
        )}
        {saved && (
          <span className="ml-auto text-xs font-semibold text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {saved}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Left column: overview + members + appointments ── */}
        <div className="col-span-2 space-y-5">

          {/* Overview card */}
          <div className="rounded-xl p-5" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Plan', value: <span style={{ color: planColor }} className="font-bold capitalize">{org.plan}</span> },
                { label: 'Trial ends', value: org.trial_ends_at ? formatDate(org.trial_ends_at) : '—' },
                { label: 'Twilio', value: org.twilio_phone_number ?? 'Not configured' },
                { label: 'Review URL', value: org.review_url ? <a href={org.review_url} target="_blank" rel="noreferrer" className="text-orange-300 hover:underline truncate flex items-center gap-1"><ExternalLink className="w-3 h-3" />Configured</a> : '—' },
                { label: 'Org ID', value: <span className="font-mono text-[11px] text-slate-500">{org.id}</span> },
                { label: 'Created', value: formatDate(org.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Members ({members.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['User', 'Role', 'Push', 'Admin', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr
                    key={m.id}
                    style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{m.email ?? m.id}</p>
                      {m.full_name && <p className="text-xs text-slate-500">{m.full_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="px-4 py-3">
                      {m.expo_push_token
                        ? <Bell className="w-3.5 h-3.5 text-orange-300" />
                        : <BellOff className="w-3.5 h-3.5 text-slate-600" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      {m.is_admin
                        ? <Shield className="w-3.5 h-3.5 text-amber-400" />
                        : <ShieldOff className="w-3.5 h-3.5 text-slate-700" />
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-600 text-sm">
                      No members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent appointments */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Recent Appointments (last 10)
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {appointments.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-600 text-sm">No appointments yet.</div>
              )}
              {appointments.map(a => {
                const client = a.clients as { name: string } | null
                const tech = a.technicians as { name: string } | null
                return (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-base">{a.service_icon ?? '🔧'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{client?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{a.service} · {tech?.name ?? 'Unassigned'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold" style={{ color: STATUS_COLORS[a.status] ?? '#94a3b8' }}>
                        {a.status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-600">{formatDateTime(a.scheduled_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: actions ── */}
        <div className="space-y-4">

          {/* Plan */}
          <ActionCard title="Change Plan">
            <div className="space-y-2">
              {['trial', 'starter', 'pro', 'enterprise', 'gifted'].map(p => (
                <button
                  key={p}
                  onClick={() => handlePlanChange(p)}
                  disabled={saving || org.plan === p}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                    org.plan === p
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={org.plan === p ? {
                    background: `${PLAN_COLORS[p]}20`,
                    border: `1px solid ${PLAN_COLORS[p]}50`,
                    color: PLAN_COLORS[p],
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="capitalize">{p}</span>
                    {p === 'gifted' && org.plan !== 'gifted' && (
                      <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                        admin only
                      </span>
                    )}
                  </span>
                  {org.plan === p && <CheckCircle2 className="w-4 h-4" style={{ color: PLAN_COLORS[p] }} />}
                </button>
              ))}
            </div>
          </ActionCard>

          {/* Trial extension */}
          <ActionCard title="Trial Extension">
            <div className="flex gap-2 mb-3">
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => extendTrial(d)}
                  disabled={saving}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-orange-300 hover:text-white transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  +{d}d
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={trialDate}
                onChange={e => setTrialDate(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white outline-none focus:ring-1 focus:ring-orange-400"
                style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={setTrialManual}
                disabled={saving || !trialDate}
                className="px-3 py-1.5 text-xs font-semibold text-black rounded-lg transition-colors disabled:opacity-50 bg-orange-500 hover:bg-orange-400"
              >
                Set
              </button>
            </div>
            {org.trial_ends_at && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Expires {formatDate(org.trial_ends_at)}
              </p>
            )}
          </ActionCard>

          {/* Suspend */}
          <ActionCard title={org.suspended_at ? 'Org Suspended' : 'Suspend Org'}>
            {org.suspended_at ? (
              <div>
                <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Suspended {formatDate(org.suspended_at)}
                </p>
                <button
                  onClick={toggleSuspend}
                  disabled={saving}
                  className="w-full py-2 text-sm font-semibold text-green-400 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  Unsuspend Org
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-3">
                  Suspending blocks all API access for this org's users.
                </p>
                <button
                  onClick={toggleSuspend}
                  disabled={saving}
                  className="w-full py-2 text-sm font-semibold text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  Suspend Org
                </button>
              </div>
            )}
          </ActionCard>

          {/* Delete org */}
          <ActionCard title="Delete Org">
            {deleteConfirm ? (
              <div>
                <p className="text-xs text-red-400 mb-3">
                  Permanently delete <span className="font-semibold">{org.business_name ?? org.name}</span> and all associated data? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 py-2 text-xs font-semibold text-slate-400 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteOrg}
                    disabled={deleting}
                    className="flex-1 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    style={{ background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.5)' }}
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-3">
                  Permanently removes the org, all users, appointments, and data.
                </p>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2 text-sm font-semibold text-red-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Org
                </button>
              </div>
            )}
          </ActionCard>

          {/* View as org */}
          <ActionCard title="Support View">
            <p className="text-xs text-slate-500 mb-3">
              Open the dashboard as this org to see exactly what they see.
            </p>
            <a
              href={`/dashboard?view_as=${org.id}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View as org
            </a>
          </ActionCard>

        </div>
      </div>
    </div>
  )
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0d0f17', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    owner:      { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    dispatcher: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    viewer:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
  }
  const s = colors[role] ?? colors.viewer
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {role}
    </span>
  )
}
