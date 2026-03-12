'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, User, Check, Loader2, Mail, Copy, CheckCheck, UserPlus, Users } from 'lucide-react'

interface Technician {
  id: string
  name: string
  initials: string
  color: string
  phone: string | null
  is_active: boolean
}

interface Invitation {
  id: string
  email: string
  role: 'dispatcher' | 'viewer'
  token: string
  created_at: string
  expires_at: string
}

const COLOR_OPTIONS = [
  { label: 'Blue',   value: 'blue',   cls: 'bg-blue-500' },
  { label: 'Purple', value: 'purple', cls: 'bg-purple-500' },
  { label: 'Green',  value: 'green',  cls: 'bg-green-500' },
  { label: 'Orange', value: 'orange', cls: 'bg-orange-500' },
  { label: 'Red',    value: 'red',    cls: 'bg-red-500' },
  { label: 'Teal',   value: 'teal',   cls: 'bg-teal-500' },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const colorBgMap: Record<string, string> = {
  blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500',
  orange: 'bg-orange-500', red: 'bg-red-500', teal: 'bg-teal-500',
}

interface FormState {
  name: string
  color: string
  phone: string
}

const BLANK: FormState = { name: '', color: 'blue', phone: '' }

type PanelTab = 'technicians' | 'invitations'

export function TechnicianPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<PanelTab>('technicians')

  // ── Technician state ──────────────────────────────────────────────────────
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [techError, setTechError] = useState<string | null>(null)

  // ── Invitation state ──────────────────────────────────────────────────────
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'dispatcher' | 'viewer'>('dispatcher')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const fetchTechnicians = useCallback(async () => {
    const res = await fetch('/api/technicians')
    if (res.ok) {
      const json = await res.json()
      setTechnicians(json.technicians)
    }
    setLoading(false)
  }, [])

  const fetchInvitations = useCallback(async () => {
    setInviteLoading(true)
    const res = await fetch('/api/invitations')
    if (res.ok) {
      const json = await res.json()
      setInvitations(json.invitations ?? [])
    }
    setInviteLoading(false)
  }, [])

  useEffect(() => { fetchTechnicians() }, [fetchTechnicians])
  useEffect(() => {
    if (activeTab === 'invitations') fetchInvitations()
  }, [activeTab, fetchInvitations])

  // ── Technician handlers ───────────────────────────────────────────────────
  const startEdit = (tech: Technician) => {
    setEditingId(tech.id)
    setForm({ name: tech.name, color: tech.color ?? 'blue', phone: tech.phone ?? '' })
    setTechError(null)
  }

  const startNew = () => {
    setEditingId('new')
    setForm(BLANK)
    setTechError(null)
  }

  const cancelEdit = () => { setEditingId(null); setForm(BLANK); setTechError(null) }

  const handleSave = async () => {
    if (!form.name.trim()) { setTechError('Name is required'); return }
    setSaving(true)
    setTechError(null)

    const initials = getInitials(form.name)

    if (editingId === 'new') {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), color: form.color, phone: form.phone || null, initials }),
      })
      if (res.ok) {
        await fetchTechnicians()
        cancelEdit()
      } else {
        const j = await res.json()
        setTechError(j.error ?? 'Failed to add technician')
      }
    } else {
      const res = await fetch(`/api/technicians/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), color: form.color, phone: form.phone || null, initials }),
      })
      if (res.ok) {
        await fetchTechnicians()
        cancelEdit()
      } else {
        const j = await res.json()
        setTechError(j.error ?? 'Failed to update technician')
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this technician?')) return
    await fetch(`/api/technicians/${id}`, { method: 'DELETE' })
    setTechnicians(prev => prev.filter(t => t.id !== id))
  }

  // ── Invitation handlers ───────────────────────────────────────────────────
  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError('Email is required'); return }
    setInviteSending(true)
    setInviteError(null)

    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    const json = await res.json()

    if (!res.ok) {
      setInviteError(json.error ?? 'Failed to create invitation')
    } else {
      setInviteEmail('')
      await fetchInvitations()
    }
    setInviteSending(false)
  }

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Revoke this invitation?')) return
    await fetch(`/api/invitations/${id}`, { method: 'DELETE' })
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  const copyInviteLink = (token: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const link = `${appUrl}/signup?token=${token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2500)
    })
  }

  const formatExpiry = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col"
        style={{ background: '#0d0f17', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div className="text-white px-5 py-4 flex items-center justify-between shrink-0"
          style={{ background: '#0d0f17', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h2 className="font-bold text-base">Manage Team</h2>
            <p className="text-xs text-slate-500 mt-0.5">Technicians & member invitations</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 px-4 pt-3 gap-1"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setActiveTab('technicians')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors ${
              activeTab === 'technicians'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Technicians
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors ${
              activeTab === 'invitations'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Invite Members
          </button>
        </div>

        {/* ── Technicians Tab ── */}
        {activeTab === 'technicians' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <>
                  {technicians.map(tech => (
                    <div key={tech.id} className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      {editingId === tech.id ? (
                        <TechForm
                          form={form}
                          setForm={setForm}
                          onSave={handleSave}
                          onCancel={cancelEdit}
                          saving={saving}
                          error={techError}
                        />
                      ) : (
                        <div className="flex items-center gap-3 p-3">
                          <div className={`w-9 h-9 rounded-full ${colorBgMap[tech.color] ?? 'bg-blue-500'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {tech.initials || getInitials(tech.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white">{tech.name}</p>
                            {tech.phone && <p className="text-xs text-slate-400">{tech.phone}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(tech)}
                              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tech.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {technicians.length === 0 && editingId !== 'new' && (
                    <div className="text-center py-8 text-slate-500">
                      <User className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No technicians yet</p>
                    </div>
                  )}

                  {/* Add new form */}
                  {editingId === 'new' && (
                    <div className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}
                    >
                      <div className="px-3 pt-3 pb-1 text-xs font-semibold text-blue-400">New Technician</div>
                      <TechForm
                        form={form}
                        setForm={setForm}
                        onSave={handleSave}
                        onCancel={cancelEdit}
                        saving={saving}
                        error={techError}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {editingId !== 'new' && (
              <div className="shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={startNew}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
                  style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Plus className="w-4 h-4" />
                  Add technician
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Invitations Tab ── */}
        {activeTab === 'invitations' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Invite form */}
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Invite a team member
              </p>
              <p className="text-xs text-slate-500">
                They&apos;ll receive a link to create their account and join your org automatically.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                  placeholder="team@example.com"
                  className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <div className="flex gap-2">
                  {(['dispatcher', 'viewer'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                        inviteRole === r
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">
                  {inviteRole === 'dispatcher'
                    ? 'Can view and manage all appointments'
                    : 'Can view appointments (read-only)'}
                </p>
              </div>

              {inviteError && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{inviteError}</p>
              )}

              <button
                onClick={handleSendInvite}
                disabled={inviteSending}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {inviteSending ? 'Creating link…' : 'Generate invite link'}
              </button>
            </div>

            {/* Pending invitations list */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Pending Invitations
              </p>

              {inviteLoading && (
                <div className="flex items-center justify-center h-20 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                </div>
              )}

              {!inviteLoading && invitations.length === 0 && (
                <div className="text-center py-6 text-slate-600">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No pending invitations</p>
                </div>
              )}

              <div className="space-y-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            inv.role === 'dispatcher'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {inv.role}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            Expires {formatExpiry(inv.expires_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          title="Copy invite link"
                          className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          {copiedToken === inv.token
                            ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          title="Revoke invitation"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TechForm({
  form, setForm, onSave, onCancel, saving, error,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <div className="p-3 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Alex Torres"
          className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Phone (optional)</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="(555) 000-0000"
          className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">Colour</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setForm(f => ({ ...f, color: c.value }))}
              className={`w-7 h-7 rounded-full ${c.cls} flex items-center justify-center transition-transform ${form.color === c.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500 scale-110' : 'hover:scale-110'}`}
              title={c.label}
            >
              {form.color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
          style={{ background: '#2563eb' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
