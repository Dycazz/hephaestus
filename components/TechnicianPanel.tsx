'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, User, Check, Loader2, Mail, Copy, CheckCheck, UserPlus, Users, Clock } from 'lucide-react'
import { TechnicianAvailabilityModal } from '@/components/TechnicianAvailabilityModal'

interface Technician {
  id: string
  name: string
  initials: string
  color: string
  phone: string | null
  is_active: boolean
  commission_percent: number
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
  commission: string
}

const BLANK: FormState = { name: '', color: 'blue', phone: '', commission: '' }

type PanelTab = 'technicians' | 'invitations'

export function TechnicianPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<PanelTab>('technicians')

  // ── Availability modal ────────────────────────────────────────────────────
  const [availModalTech, setAvailModalTech] = useState<{ id: string; name: string } | null>(null)

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
  const [inviteRole, setInviteRole] = useState<'dispatcher' | 'viewer' | 'technician'>('dispatcher')
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
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
    setForm({ name: tech.name, color: tech.color ?? 'blue', phone: tech.phone ?? '', commission: String(tech.commission_percent ?? 0) })
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
        body: JSON.stringify({ name: form.name.trim(), color: form.color, phone: form.phone || null, initials, commission_percent: parseFloat(form.commission) || 0 }),
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
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, technicianId: selectedTechId }),
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
      {availModalTech && (
        <TechnicianAvailabilityModal
          technicianId={availModalTech.id}
          technicianName={availModalTech.name}
          onClose={() => setAvailModalTech(null)}
        />
      )}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col glass-morphism border-l border-[rgba(44,52,64,0.3)]"
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-[rgba(44,52,64,0.2)]">
          <div>
            <h2 className="font-bold text-base text-text-primary">Manage Team</h2>
            <p className="text-xs text-text-muted mt-0.5">Technicians & member invitations</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex shrink-0 px-4 pt-3 gap-1 border-b border-[rgba(44,52,64,0.1)]">
          <button
            onClick={() => setActiveTab('technicians')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors ${
              activeTab === 'technicians'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Technicians
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-colors ${
              activeTab === 'invitations'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-primary'
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
                <div className="flex items-center justify-center h-32 text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <>
                  {technicians.map(tech => (
                    <div key={tech.id} className="rounded-xl overflow-hidden bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] shadow-sm"
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
                          <div className-="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-text-primary">{tech.name}</p>
                            {tech.phone && <p className="text-xs text-text-muted">{tech.phone}</p>}
                            {(tech.commission_percent ?? 0) > 0 && (
                              <p className="text-[10px] text-accent/80">{tech.commission_percent}% commission</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAvailModalTech({ id: tech.id, name: tech.name })}
                              title="Set working hours"
                              className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-900/30 rounded-lg transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
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
                    <div className="text-center py-8 text-text-muted">
                      <User className="w-10 h-10 mx-auto mb-2 opacity-10" />
                      <p className="text-sm">No technicians yet</p>
                    </div>
                  )}

                  {/* Add new form */}
                  {editingId === 'new' && (
                    <div className="rounded-xl overflow-hidden border border-accent/30 bg-accent/5"
                    >
                      <div className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-accent">New Technician</div>
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
              <div className="shrink-0 p-4 border-t border-[rgba(44,52,64,0.1)]">
                <button
                  onClick={startNew}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-text-primary text-sm font-bold bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] hover:bg-[rgba(44,52,64,0.15)] transition-all"
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
            <div className="rounded-xl p-4 space-y-3 bg-accent/5 border border-accent/20">
              <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Invite a team member
              </p>
              <p className="text-xs text-text-muted">
                They&apos;ll receive a link to create their account and join your org automatically.
              </p>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 px-1">Email address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                  placeholder="team@example.com"
                  className="w-full bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted/40 outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1 px-1">Role</label>
                <div className="flex gap-2 mb-3">
                  {(['dispatcher', 'viewer', 'technician'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${
                        inviteRole === r
                          ? 'bg-accent text-white border-accent shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.2)]'
                          : 'bg-[rgba(44,52,64,0.1)] text-text-secondary border-[rgba(44,52,64,0.3)] hover:border-accent'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {inviteRole === 'technician' && (
                  <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-text-muted mb-1 px-1">Link to Technician</label>
                    <select
                      value={selectedTechId ?? ''}
                      onChange={e => setSelectedTechId(e.target.value || null)}
                      className="w-full bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="">Select a technician...</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-text-muted mt-1 px-1">
                      The user will be restricted to viewing only their own assigned appointments.
                    </p>
                  </div>
                )}

                <p className="text-[10px] uppercase font-bold text-text-muted/60 mt-1.5 px-1 tracking-tight">
                  {inviteRole === 'dispatcher'
                    ? 'Can view and manage all appointments'
                    : inviteRole === 'viewer'
                    ? 'Can view appointments (read-only)'
                    : 'Can view only their own assigned appointments (read-only)'}
                </p>
              </div>

              {inviteError && (
                <p className="text-xs text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{inviteError}</p>
              )}

              <button
                onClick={handleSendInvite}
                disabled={inviteSending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:filter hover:brightness-110 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-all shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.2)]"
              >
                {inviteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {inviteSending ? 'Creating link…' : 'Generate invite link'}
              </button>
            </div>

            {/* Pending invitations list */}
            <div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-3 px-1">
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
                  <div key={inv.id} className="rounded-xl p-3 bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary font-bold truncate">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inv.role === 'dispatcher'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-[rgba(44,52,64,0.2)] text-text-muted'
                          }`}>
                            {inv.role}
                          </span>
                          <span className="text-[10px] text-text-muted/60">
                            Expires {formatExpiry(inv.expires_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          title="Copy invite link"
                          className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                        >
                          {copiedToken === inv.token
                            ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          title="Revoke invitation"
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
        <label className="block text-xs font-bold text-text-muted mb-1 px-1">Full Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Alex Torres"
          className="w-full bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted/40 outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-muted mb-1 px-1">Phone (optional)</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="(555) 000-0000"
          className="w-full bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted/40 outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-muted mb-1 px-1">Commission % (optional)</label>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="100" step="0.5"
            value={form.commission}
            onChange={e => setForm(f => ({ ...f, commission: e.target.value }))}
            placeholder="0"
            className="w-24 bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
          />
          <span className="text-[10px] uppercase font-bold text-text-muted/60">% of job revenue</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-text-muted mb-2 px-1">Colour</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setForm(f => ({ ...f, color: c.value }))}
              className={`w-7 h-7 rounded-full ${c.cls} flex items-center justify-center transition-transform ${form.color === c.value ? 'ring-2 ring-offset-2 ring-offset-[#1a1d26] ring-accent scale-110' : 'hover:scale-110'}`}
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

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-accent hover:filter hover:brightness-110 text-white text-sm font-bold rounded-lg transition-all shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.2)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-[rgba(44,52,64,0.1)] border border-[rgba(44,52,64,0.3)] hover:bg-[rgba(44,52,64,0.15)] text-text-secondary text-sm font-bold rounded-lg transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
