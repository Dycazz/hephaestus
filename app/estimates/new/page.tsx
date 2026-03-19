'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Loader2, User, Search,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  address: string
}

interface LineItemDraft {
  key: string
  appointment_id: string | null
  description: string
  quantity: number
  unit_price_dollars: string
  tax_exempt: boolean
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
  return { key: Math.random().toString(36).slice(2), appointment_id: null, description: '', quantity: 1, unit_price_dollars: '', tax_exempt: false }
}

// ── ClientSelector ─────────────────────────────────────────────────────────────

function ClientSelector({ value, onChange }: { value: Client | null; onChange: (c: Client | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function search(q: string) {
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.clients ?? [])
      setOpen(true)
      setSearching(false)
    }, 300)
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div>
          <p className="font-semibold text-white">{value.name}</p>
          {value.email && <p className="text-xs text-stone-400">{value.email}</p>}
        </div>
        <button onClick={() => onChange(null)} className="text-xs text-stone-500 hover:text-white">Change</button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <Search className="h-4 w-4 text-stone-500" />
        <input
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search clients by name, phone, or email…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-stone-600 outline-none"
        />
        {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c); setOpen(false); setQuery('') }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition"
            >
              <User className="h-4 w-4 shrink-0 text-stone-500" />
              <div>
                <p className="text-sm font-semibold text-white">{c.name}</p>
                <p className="text-xs text-stone-400">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main form component ────────────────────────────────────────────────────────

function NewEstimateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { org } = useOrg()

  const [client, setClient] = useState<Client | null>(null)
  const [title, setTitle] = useState('')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([newItem()])
  const [issuedDate, setIssuedDate] = useState(today())
  const [expiryDate, setExpiryDate] = useState(addDays(today(), 30))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendAfter, setSendAfter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill from URL params (from appointment button)
  useEffect(() => {
    const service = searchParams.get('service')
    const priceCents = searchParams.get('price_cents')
    const appointmentId = searchParams.get('appointment_id')
    if (service) {
      setLineItems([{
        key: Math.random().toString(36).slice(2),
        appointment_id: appointmentId,
        description: decodeURIComponent(service),
        quantity: 1,
        unit_price_dollars: priceCents ? (parseInt(priceCents) / 100).toFixed(2) : '',
        tax_exempt: false,
      }])
    }
  }, [searchParams])

  function updateItem(key: string, updates: Partial<LineItemDraft>) {
    setLineItems(items => items.map(item => item.key === key ? { ...item, ...updates } : item))
  }

  function removeItem(key: string) {
    setLineItems(items => items.filter(item => item.key !== key))
  }

  // Live subtotal
  const subtotal = lineItems.reduce((sum, li) => {
    const price = parseFloat(li.unit_price_dollars) || 0
    return sum + li.quantity * price
  }, 0)

  async function handleSubmit(send: boolean) {
    if (!client) { setError('Please select a client.'); return }
    if (lineItems.some(li => !li.description.trim())) { setError('All line items need a description.'); return }
    setSaving(true)
    setError(null)
    setSendAfter(send)

    const payload = {
      client_id:   client.id,
      title:       title || null,
      issued_date: issuedDate,
      expiry_date: expiryDate || null,
      notes:       notes || null,
      line_items:  lineItems.map(li => ({
        appointment_id:   li.appointment_id,
        description:      li.description,
        quantity:         li.quantity,
        unit_price_cents: Math.round((parseFloat(li.unit_price_dollars) || 0) * 100),
        tax_exempt:       li.tax_exempt,
      })),
    }

    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error ?? 'Failed to create estimate')
      return
    }

    const estimateId = json.estimate.id
    if (send) {
      router.push(`/estimates/${estimateId}?send=1`)
    } else {
      router.push(`/estimates/${estimateId}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/estimates" className="text-stone-500 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold">New Estimate</h1>
        </div>

        <div className="space-y-5">
          {/* Client */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">Client</label>
            <ClientSelector value={client} onChange={setClient} />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Title <span className="normal-case text-stone-600">(optional)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Roof repair estimate"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-stone-600 outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Line items */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">Services / Items</label>
            <div className="space-y-2">
              {lineItems.map(item => (
                <div key={item.key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <input
                    value={item.description}
                    onChange={e => updateItem(item.key, { description: e.target.value })}
                    placeholder="Description"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-stone-600 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(item.key, { quantity: parseInt(e.target.value) || 1 })}
                    className="w-14 rounded bg-white/[0.03] px-2 py-1 text-center text-sm text-white outline-none"
                    title="Quantity"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price_dollars}
                    onChange={e => updateItem(item.key, { unit_price_dollars: e.target.value })}
                    placeholder="Price"
                    className="w-24 rounded bg-white/[0.03] px-2 py-1 text-sm text-white placeholder:text-stone-600 outline-none"
                  />
                  <button
                    onClick={() => removeItem(item.key)}
                    className="text-stone-600 hover:text-red-400 transition"
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLineItems(items => [...items, newItem()])}
              className="mt-2 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              <Plus className="h-3.5 w-3.5" /> Add line item
            </button>

            {/* Live subtotal */}
            <p className="mt-2 text-right text-sm text-stone-400">
              Subtotal: <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">Issued Date</label>
              <input
                type="date"
                value={issuedDate}
                onChange={e => setIssuedDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
                Valid Until <span className="normal-case text-stone-600">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">
              Notes <span className="normal-case text-stone-600">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional context, terms, or special conditions…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-stone-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.04] transition disabled:opacity-50"
            >
              {saving && !sendAfter ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
            >
              {saving && sendAfter ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Save & Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewEstimatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <NewEstimateForm />
    </Suspense>
  )
}
