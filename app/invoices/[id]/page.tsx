'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, FileText, Send, Check, Loader2,
  Printer, XCircle, Trash2, AlertTriangle,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'
import type { Invoice, InvoiceStatus } from '@/types'

// @react-pdf/renderer uses browser-only APIs — import client-side only
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

// InvoicePDF also client-side only
const InvoicePDF = dynamic(
  () => import('@/components/InvoicePDF').then(m => m.InvoicePDF),
  { ssr: false }
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

const STATUS_COLORS: Record<InvoiceStatus, { color: string; bg: string; label: string }> = {
  draft:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Draft'     },
  sent:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  label: 'Sent'      },
  paid:      { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: 'Paid'      },
  overdue:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Overdue'   },
  cancelled: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Cancelled' },
}

// ── Mark Paid Modal ────────────────────────────────────────────────────────────

function MarkPaidModal({
  invoiceId,
  onClose,
  onPaid,
}: { invoiceId: string; onClose: () => void; onPaid: (inv: Invoice) => void }) {
  const [method, setMethod] = useState<'cash' | 'check' | 'other'>('cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      onPaid(json.invoice)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-base font-bold text-white mb-1">Mark as Paid</h2>
        <p className="text-sm text-white/40 mb-5">How was this invoice paid?</p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {(['cash', 'check', 'other'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-xl py-3 text-sm font-semibold capitalize transition ${
                method === m ? 'bg-amber-600 text-black' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
              style={method !== m ? { border: '1px solid rgba(255,255,255,0.1)' } : undefined}
            >
              {m}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold bg-green-600 text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invoice Detail Content ─────────────────────────────────────────────────────

function InvoiceDetailContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { org } = useOrg()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canManage = org?.userRole === 'owner' || org?.userRole === 'dispatcher'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Not found'); return }
      setInvoice(json.invoice)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Auto-trigger send flow if redirected from "new" page with ?send=1
  const [autoSendTriggered, setAutoSendTriggered] = useState(false)
  useEffect(() => {
    if (invoice && searchParams.get('send') === '1' && !autoSendTriggered && invoice.status === 'draft') {
      setAutoSendTriggered(true)
      handleSend(invoice)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, searchParams])

  // Compute effective status (overdue = sent + past due date)
  const effectiveStatus: InvoiceStatus = invoice
    ? invoice.status === 'sent' && new Date(invoice.due_date) < new Date()
      ? 'overdue'
      : invoice.status
    : 'draft'

  const statusCfg = STATUS_COLORS[effectiveStatus]

  // ── Send flow ───────────────────────────────────────────────────────────────
  async function handleSend(inv: Invoice) {
    setSendError(null)
    setSending(true)

    try {
      // 1. Generate PDF client-side using @react-pdf/renderer
      const { pdf } = await import('@react-pdf/renderer')
      const { InvoicePDF: InvoicePDFComponent } = await import('@/components/InvoicePDF')
      const businessName = org?.businessName ?? 'hephaestus.work'

      const blob = await pdf(
        // @ts-ignore — dynamic import typing
        <InvoicePDFComponent invoice={inv} businessName={businessName} />
      ).toBlob()

      // 2. Upload PDF to storage
      const formData = new FormData()
      formData.append('pdf', blob, `${inv.invoice_number}.pdf`)

      const uploadRes = await fetch(`/api/invoices/${inv.id}/upload-pdf`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) {
        const j = await uploadRes.json()
        console.warn('[Invoice] PDF upload failed:', j.error)
        // Non-fatal — continue without PDF
      }

      // 3. Send invoice (create payment link + email)
      const sendRes = await fetch(`/api/invoices/${inv.id}/send`, { method: 'POST' })
      const sendJson = await sendRes.json()

      if (!sendRes.ok) {
        setSendError(sendJson.error ?? 'Failed to send invoice')
        return
      }

      // Reload invoice to get updated status + payment link
      await load()

    } catch (err) {
      console.error('[Invoice] Send error:', err)
      setSendError('Failed to generate or send invoice. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const copyPaymentLink = async () => {
    if (!invoice?.stripe_payment_link_url) return
    await navigator.clipboard.writeText(invoice.stripe_payment_link_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!invoice) return
    if (!confirm(invoice.status === 'draft' ? 'Delete this draft invoice?' : 'Cancel this invoice?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (res.ok) router.push('/invoices')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error ?? 'Invoice not found'}</p>
          <Link href="/invoices" className="text-sm text-white/50 hover:text-white transition">← Back to invoices</Link>
        </div>
      </div>
    )
  }

  const client = invoice.client
  const lineItems = invoice.line_items ?? []
  const businessName = org?.businessName ?? 'hephaestus.work'

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="rounded-md p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-mono">{invoice.invoice_number}</h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: statusCfg.color, background: statusCfg.bg }}
                >
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Issued {fmtDate(invoice.issued_date)} · Due {fmtDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {canManage && (
            <div className="flex items-center gap-2">
              {(invoice.status === 'draft') && (
                <>
                  <button
                    onClick={() => router.push(`/invoices/new?edit=${invoice.id}`)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleSend(invoice)}
                    disabled={sending}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-black transition hover:-translate-y-0.5 hover:bg-amber-500 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {sending ? 'Sending…' : 'Generate PDF & Send'}
                  </button>
                </>
              )}
              {(invoice.status === 'sent' || effectiveStatus === 'overdue') && (
                <>
                  <button
                    onClick={() => setShowMarkPaid(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-green-500"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => handleSend(invoice)}
                    disabled={sending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Resend
                  </button>
                </>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg p-1.5 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                title={invoice.status === 'draft' ? 'Delete invoice' : 'Cancel invoice'}
              >
                {invoice.status === 'draft' ? <Trash2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Send error */}
        {sendError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {sendError}
          </div>
        )}

        {/* Sending progress indicator */}
        {sending && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Generating PDF and sending to {client?.email ?? 'client'}…
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* From / To */}
          <div className="p-6 grid grid-cols-2 gap-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">From</p>
              <p className="text-sm font-semibold text-white">{businessName}</p>
            </div>
            {client && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">Bill to</p>
                <p className="text-sm font-semibold text-white">{client.name}</p>
                {client.email && <p className="text-xs text-white/40 mt-0.5">{client.email}</p>}
                {client.phone && <p className="text-xs text-white/40">{client.phone}</p>}
                {client.address && <p className="text-xs text-white/40">{client.address}</p>}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="grid grid-cols-[1fr_40px_80px_80px] gap-3 mb-3">
              {['Description', 'Qty', 'Unit price', 'Total'].map(h => (
                <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-white/25">{h}</p>
              ))}
            </div>
            {lineItems.map((li, i) => (
              <div
                key={li.id}
                className="grid grid-cols-[1fr_40px_80px_80px] gap-3 items-center py-2.5"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
              >
                <p className="text-sm text-white">{li.description}</p>
                <p className="text-sm text-white/60 text-center">{li.quantity}</p>
                <p className="text-sm text-white/60 text-right">{fmt(li.unit_price_cents)}</p>
                <p className="text-sm text-white text-right">{fmt(li.total_cents)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/40">Subtotal</p>
              <p className="text-sm text-white">{fmt(invoice.subtotal_cents)}</p>
            </div>
            {invoice.tax_cents > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">Tax</p>
                <p className="text-sm text-white">{fmt(invoice.tax_cents)}</p>
              </div>
            )}
            <div
              className="flex items-center justify-between pt-3 mt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-base font-bold text-white">Total due</p>
              <p className="text-xl font-bold text-white">{fmt(invoice.total_cents)}</p>
            </div>
            {invoice.status === 'paid' && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-400 font-semibold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Paid {invoice.paid_at ? fmtDate(invoice.paid_at.slice(0, 10)) : ''}
                </p>
                <p className="text-xs text-white/30 capitalize">{invoice.payment_method ?? ''}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-4 rounded-xl p-4" style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">Notes</p>
            <p className="text-sm text-white/60">{invoice.notes}</p>
          </div>
        )}

        {/* Payment link */}
        {invoice.stripe_payment_link_url && invoice.status !== 'paid' && (
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60 mb-2">Payment link</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-xs text-amber-400">{invoice.stripe_payment_link_url}</p>
              <button
                onClick={copyPaymentLink}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/10"
                style={{ border: '1px solid rgba(217,119,6,0.3)' }}
              >
                {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={invoice.stripe_payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/10"
                style={{ border: '1px solid rgba(217,119,6,0.3)' }}
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </div>
          </div>
        )}

        {/* PDF download (client-side) */}
        {invoice.status !== 'draft' && (
          <div className="mt-4 flex items-center gap-3">
            <Suspense fallback={null}>
              {/* @ts-ignore — dynamic PDFDownloadLink types */}
              <PDFDownloadLink
                document={
                  invoice && (
                    // @ts-ignore
                    <InvoicePDF invoice={invoice} businessName={businessName} />
                  )
                }
                fileName={`${invoice.invoice_number}.pdf`}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {({ loading: pdfLoading }: { loading: boolean }) => (
                  <>
                    {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                    {pdfLoading ? 'Preparing PDF…' : 'Download PDF'}
                  </>
                )}
              </PDFDownloadLink>
            </Suspense>
          </div>
        )}

      </div>

      {/* Mark paid modal */}
      {showMarkPaid && (
        <MarkPaidModal
          invoiceId={invoice.id}
          onClose={() => setShowMarkPaid(false)}
          onPaid={updated => {
            setInvoice(prev => prev ? { ...prev, ...updated } : prev)
            setShowMarkPaid(false)
          }}
        />
      )}

    </div>
  )
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    }>
      <InvoiceDetailContent />
    </Suspense>
  )
}
