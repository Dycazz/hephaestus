'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Loader2, User, CalendarDays,
  FileText, Search,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  address: string
}

interface LineItemDraft {
  key: string       // random key for React list
  appointment_id: string | null
  description: string
  quantity: number
  unit_price_dollars: string  // string for input control
}

interface CompletedAppointment {
  id: string
  service: string
  scheduled_at: string
  price_cents: number | null
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function newItem(): LineItemDraft {
  return { key: Math.random().toString(36).slice(2), appointment_id: null, description: '', quantity: 1, unit_price_dollars: '' }
}

// ── Client Search ──────────────────────────────────────────────────────────────

function ClientSelector({
  selected, onSelect,
}: {
  selected: Client | null
  onSelect: (c: Client) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        setResults(json.clients ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [query])

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl p-3" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-600/20 flex items-center justify-center">
            <User className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{selected.name}</p>
            <p className="text-xs text-white/40">{selected.email ?? selected.phone}</p>
          </div>
        </div>
        <button
          onClick={() => onSelect({ id: '', name: '', email: null, phone: '', address: '' })}
          className="text-xs text-white/30 hover:text-white/70 transition"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <input
          type="text"
          placeholder="Search clients by name, phone, or email…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
        />
        {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30 shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); setQuery('') }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition"
            >
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-white/40">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Appointment picker ─────────────────────────────────────────────────────────

function AppointmentPicker({
  clientId,
  onPick,
}: {
  clientId: string
  onPick: (appt: CompletedAppointment) => void
}) {
  const [appts, setAppts] = useState<CompletedAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/appointments?client_id=${clientId}`)
      .then(r => r.json())
      .then(json => {
        const completed = (json.appointments ?? []).filter(
          (a: { status: string }) => a.status === 'completed'
        )
        setAppts(completed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
  if (appts.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-600/10"
        style={{ border: '1px solid rgba(217,119,6,0.3)' }}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Add from appointment ({appts.length})
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {appts.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onPick(a); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition"
            >
              <p className="text-sm font-medium text-white">{a.service}</p>
              <p className="text-xs text-white/40">
                {new Date(a.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {a.price_cents != null ? ` · $${(a.price_cents / 100).toFixed(2)}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New Invoice Form ───────────────────────────────────────────────────────────

function NewInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { org } = useOrg()

  const [client, setClient] = useState<Client | null>(null)
  const [issuedDate, setIssuedDate] = useState(today())
  const [dueDate, setDueDate] = useState(addDays(today(), 30))
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([newItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from appointment if ?appointment_id= is set
  const prefillApptId = searchParams.get('appointment_id')
  const prefillService = searchParams.get('service')
  const prefillPrice   = searchParams.get('price_cents')
  const prefillClient  = searchParams.get('client_id')
  const prefillClientName = searchParams.get('client_name')

  useEffect(() => {
    if (prefillApptId && prefillService) {
      setLineItems([{
        key: 'prefill',
        appointment_id: prefillApptId,
        description: prefillService,
        quantity: 1,
        unit_price_dollars: prefillPrice ? (parseInt(prefillPrice) / 100).toFixed(2) : '',
      }])
    }
    if (prefillClient && prefillClientName) {
      // Lightweight pre-fill (no email/phone/address needed for selection)
      setClient({ id: prefillClient, name: prefillClientName, email: null, phone: '', address: '' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateItem = (key: string, field: keyof LineItemDraft, value: string | number | null) => {
    setLineItems(items => items.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  const removeItem = (key: string) => {
    setLineItems(items => items.filter(i => i.key !== key))
  }

  const addAppointmentItem = (appt: CompletedAppointment) => {
    setLineItems(items => [...items, {
      key: Math.random().toString(36).slice(2),
      appointment_id: appt.id,
      description: appt.service,
      quantity: 1,
      unit_price_dollars: appt.price_cents != null ? (appt.price_cents / 100).toFixed(2) : '',
    }])
  }

  // Live total computation
  const subtotalCents = lineItems.reduce((sum, li) => {
    const dollars = parseFloat(li.unit_price_dollars || '0')
    return sum + (isNaN(dollars) ? 0 : Math.round(dollars * 100)) * li.quantity
  }, 0)

  const submit = async (sendNow: boolean) => {
    setError(null)
    if (!client?.id) { setError('Please select a client'); return }
    if (lineItems.length === 0) { setError('Add at least one line item'); return }

    const invalidItems = lineItems.filter(li => !li.description.trim())
    if (invalidItems.length > 0) { setError('All line items must have a description'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:   client.id,
          issued_date: issuedDate,
          due_date:    dueDate,
          notes:       notes.trim() || null,
          line_items:  lineItems.map(li => ({
            appointment_id:   li.appointment_id,
            description:      li.description,
            quantity:         li.quantity,
            unit_price_cents: Math.round(parseFloat(li.unit_price_dollars || '0') * 100),
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create invoice')
        return
      }

      const invoiceId = json.invoice.id
      if (sendNow) {
        router.push(`/invoices/${invoiceId}?send=1`)
      } else {
        router.push(`/invoices/${invoiceId}`)
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const canManage = org?.userRole === 'owner' || org?.userRole === 'dispatcher'
  if (org && !canManage) {
    return (
      <div className="py-20 text-center text-sm text-white/30">
        You don't have permission to create invoices.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/invoices" className="rounded-md p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              New Invoice
            </h1>
            <p className="text-xs text-white/40 mt-0.5">Create a new invoice to send to a client</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Client */}
          <section className="rounded-2xl p-5 space-y-3" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Bill to</h2>
            <ClientSelector
              selected={client?.id ? client : null}
              onSelect={c => setClient(c.id ? c : null)}
            />
          </section>

          {/* Dates */}
          <section className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Issue date', value: issuedDate, set: setIssuedDate },
                { label: 'Due date',   value: dueDate,   set: setDueDate   },
              ].map(({ label, value, set }) => (
                <label key={label} className="block">
                  <p className="text-xs text-white/40 mb-1">{label}</p>
                  <input
                    type="date"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Line items</h2>
              <div className="flex items-center gap-2">
                {client?.id && (
                  <AppointmentPicker clientId={client.id} onPick={addAppointmentItem} />
                )}
                <button
                  type="button"
                  onClick={() => setLineItems(i => [...i, newItem()])}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Plus className="h-3 w-3" />
                  Custom item
                </button>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_52px_88px_36px] gap-2 mb-2 px-1">
              {['Description', 'Qty', 'Unit price', ''].map(h => (
                <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-white/20">{h}</p>
              ))}
            </div>

            <div className="space-y-2">
              {lineItems.map(li => (
                <div key={li.key} className="grid grid-cols-[1fr_52px_88px_36px] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Service description"
                    value={li.description}
                    onChange={e => updateItem(li.key, 'description', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    value={li.quantity}
                    onChange={e => updateItem(li.key, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-lg px-2 py-2 text-sm text-white text-center outline-none focus:ring-1 focus:ring-amber-500/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={li.unit_price_dollars}
                      onChange={e => updateItem(li.key, 'unit_price_dollars', e.target.value)}
                      className="w-full rounded-lg pl-6 pr-2 py-2 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(li.key)}
                    disabled={lineItems.length === 1}
                    className="flex items-center justify-center rounded-lg p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Live total */}
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-white/30 mb-0.5">Estimated total</p>
                <p className="text-lg font-bold text-white">
                  ${(subtotalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs text-white/30 font-normal ml-1">+ tax</span>
                </p>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl p-5" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Notes (optional)</h2>
            <textarea
              placeholder="Payment terms, thank you message, or any other notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pb-8">
            <Link
              href="/invoices"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save & Send
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    }>
      <NewInvoiceForm />
    </Suspense>
  )
}
