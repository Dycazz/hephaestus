'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, User, Check, Loader2 } from 'lucide-react'

interface Technician {
  id: string
  name: string
  initials: string
  color: string
  phone: string | null
  is_active: boolean
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

export function TechnicianPanel({ onClose }: { onClose: () => void }) {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [error, setError] = useState<string | null>(null)

  const fetchTechnicians = useCallback(async () => {
    const res = await fetch('/api/technicians')
    if (res.ok) {
      const json = await res.json()
      setTechnicians(json.technicians)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTechnicians() }, [fetchTechnicians])

  const startEdit = (tech: Technician) => {
    setEditingId(tech.id)
    setForm({ name: tech.name, color: tech.color ?? 'blue', phone: tech.phone ?? '' })
    setError(null)
  }

  const startNew = () => {
    setEditingId('new')
    setForm(BLANK)
    setError(null)
  }

  const cancelEdit = () => { setEditingId(null); setForm(BLANK); setError(null) }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

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
        setError(j.error ?? 'Failed to add technician')
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
        setError(j.error ?? 'Failed to update technician')
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this technician?')) return
    await fetch(`/api/technicians/${id}`, { method: 'DELETE' })
    setTechnicians(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col bg-white">
        {/* Header */}
        <div className="text-white px-5 py-4 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(to right, #0a1628, #0d2045)' }}
        >
          <div>
            <h2 className="font-bold text-base">Manage Team</h2>
            <p className="text-xs text-blue-300/60 mt-0.5">Add, edit, or remove technicians</p>
          </div>
          <button onClick={onClose} className="text-blue-300/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <>
              {technicians.map(tech => (
                <div key={tech.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  {editingId === tech.id ? (
                    <TechForm
                      form={form}
                      setForm={setForm}
                      onSave={handleSave}
                      onCancel={cancelEdit}
                      saving={saving}
                      error={error}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-9 h-9 rounded-full ${colorBgMap[tech.color] ?? 'bg-blue-500'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {tech.initials || getInitials(tech.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800">{tech.name}</p>
                        {tech.phone && <p className="text-xs text-slate-400">{tech.phone}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tech)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tech.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {technicians.length === 0 && editingId !== 'new' && (
                <div className="text-center py-8 text-slate-400">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No technicians yet</p>
                </div>
              )}

              {/* Add new form */}
              {editingId === 'new' && (
                <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-blue-700">New Technician</div>
                  <TechForm
                    form={form}
                    setForm={setForm}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    saving={saving}
                    error={error}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {editingId !== 'new' && (
          <div className="shrink-0 border-t border-slate-200 p-4">
            <button
              onClick={startNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #0a1628, #1e3a6e)' }}
            >
              <Plus className="w-4 h-4" />
              Add Technician
            </button>
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
        <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Alex Torres"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Phone (optional)</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="(555) 000-0000"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Colour</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setForm(f => ({ ...f, color: c.value }))}
              className={`w-7 h-7 rounded-full ${c.cls} flex items-center justify-center transition-transform ${form.color === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
              title={c.label}
            >
              {form.color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #0a1628, #1e3a6e)' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
