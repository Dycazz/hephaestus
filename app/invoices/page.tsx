'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Plus, ArrowLeft, Loader2, Check,
  Clock, SendHorizonal, XCircle, AlertCircle,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'
import type { Invoice, InvoiceStatus } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: FileText     },
  sent:      { label: 'Sent',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: SendHorizonal },
  paid:      { label: 'Paid',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: Check         },
  overdue:   { label: 'Overdue',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: AlertCircle   },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: XCircle      },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  )
}

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { org } = useOrg()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const canManage = org?.userRole === 'owner' || org?.userRole === 'dispatcher'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/invoices${params}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load invoices')
      } else {
        // Mark overdue: sent invoices past due date
        const now = new Date()
        const marked = (json.invoices as Invoice[]).map(inv => ({
          ...inv,
          status: inv.status === 'sent' && new Date(inv.due_date) < now
            ? 'overdue' as InvoiceStatus
            : inv.status,
        }))
        setInvoices(marked)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  // Redirect if on trial
  useEffect(() => {
    if (org && org.plan === 'trial') {
      router.push('/settings?upgrade=invoicing')
    }
  }, [org, router])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Back + header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                Invoices
              </h1>
              <p className="text-xs text-white/40 mt-0.5">Create, send, and track client invoices</p>
            </div>
          </div>

          {canManage && (
            <Link
              href="/invoices/new"
              className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:-translate-y-0.5 hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New Invoice
            </Link>
          )}
        </div>

        {/* Status filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                statusFilter === f.key
                  ? 'bg-amber-600 text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
            {error}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-20 text-center">
            <FileText className="mx-auto h-10 w-10 text-white/10 mb-4" />
            <p className="text-sm font-medium text-white/30">
              {statusFilter ? `No ${statusFilter} invoices` : 'No invoices yet'}
            </p>
            {canManage && !statusFilter && (
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-amber-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1a1d26', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/30">Invoice #</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/30">Client</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/30 hidden sm:table-cell">Issued</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/30 hidden md:table-cell">Due</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/30">Amount</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer transition hover:bg-white/[0.03]"
                    style={{ borderBottom: i < invoices.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold text-amber-400">{inv.invoice_number}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-white">
                        {(inv.client as { name: string } | undefined)?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-xs text-white/50">{fmtDate(inv.issued_date)}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`text-xs ${inv.status === 'overdue' ? 'text-red-400 font-semibold' : 'text-white/50'}`}>
                        {fmtDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-white">{fmt(inv.total_cents)}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary totals */}
        {!loading && invoices.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              {
                label: 'Total Outstanding',
                value: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0),
                color: '#60a5fa',
              },
              {
                label: 'Collected',
                value: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0),
                color: '#4ade80',
              },
              {
                label: 'Overdue',
                value: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0),
                color: '#f87171',
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                <p className="text-lg font-bold" style={{ color }}>{fmt(value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Clock icon for "sent" reminder */}
        {invoices.some(i => i.status === 'sent') && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/30">
            <Clock className="h-3 w-3" />
            Sent invoices auto-mark as overdue after their due date
          </p>
        )}

      </div>
    </div>
  )
}
