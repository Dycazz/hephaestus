'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Loader2, Send, Check, X,
  RefreshCw, Download, Copy, CheckCheck,
  Trash2, Eye,
} from 'lucide-react'
import type { Estimate } from '@/types'

// PDF components are client-only
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => ({ default: m.PDFDownloadLink })),
  { ssr: false }
)
const EstimatePDF = dynamic(
  () => import('@/components/EstimatePDF').then(m => ({ default: m.EstimatePDF })),
  { ssr: false }
)

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

type PageProps = { params: Promise<{ id: string }> }

export default function EstimateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [businessName, setBusinessName] = useState('Your Business')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [estRes, orgRes] = await Promise.all([
        fetch(`/api/estimates/${id}`),
        fetch('/api/org'),
      ])
      const estJson = await estRes.json()
      const orgJson = await orgRes.json()
      if (estRes.ok) setEstimate(estJson.estimate)
      if (orgRes.ok) setBusinessName(orgJson.org?.name ?? 'Your Business')
      setLoading(false)
    }
    load()
  }, [id])

  // Auto-send if ?send=1 (from "Save & Send" flow)
  useEffect(() => {
    if (estimate && searchParams.get('send') === '1' && estimate.status === 'draft') {
      handleSend()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate?.id])

  async function handleSend() {
    setSending(true)
    setError(null)
    const res = await fetch(`/api/estimates/${id}/send`, { method: 'POST' })
    const json = await res.json()
    setSending(false)
    if (!res.ok) {
      setError(json.error ?? 'Failed to send estimate')
      return
    }
    setEstimate(e => e ? { ...e, status: 'sent' } : e)
    if (json.viewUrl) setViewUrl(json.viewUrl)
  }

  async function handleConvert() {
    if (!confirm('Convert this estimate to an invoice?')) return
    setConverting(true)
    const res = await fetch(`/api/estimates/${id}/convert`, { method: 'POST' })
    const json = await res.json()
    setConverting(false)
    if (!res.ok) { setError(json.error ?? 'Conversion failed'); return }
    router.push(`/invoices/${json.invoice.id}`)
  }

  async function handleDecline() {
    if (!confirm('Mark this estimate as declined?')) return
    const res = await fetch(`/api/estimates/${id}/decline`, { method: 'POST' })
    if (res.ok) setEstimate(e => e ? { ...e, status: 'declined' } : e)
  }

  async function handleDelete() {
    if (!confirm('Delete this estimate? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/estimates')
    } else {
      const json = await res.json()
      setError(json.error ?? 'Failed to delete')
      setDeleting(false)
    }
  }

  function copyViewUrl() {
    if (!viewUrl) return
    navigator.clipboard.writeText(viewUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-stone-400">
        <p>Estimate not found.</p>
        <Link href="/estimates" className="mt-3 text-violet-400 hover:text-violet-300">← Back to estimates</Link>
      </div>
    )
  }

  const client = estimate.client
  const lineItems = estimate.line_items ?? []
  const taxes = estimate.taxes ?? []

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hephaestus.work'
  const publicUrl = estimate.public_token ? `${appUrl}/estimates/view/${estimate.public_token}` : null
  const displayViewUrl = viewUrl ?? publicUrl

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">

        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/estimates" className="flex items-center gap-2 text-sm text-stone-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
            Estimates
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            estimate.status === 'accepted' ? 'bg-green-500/10 text-green-400' :
            estimate.status === 'declined' ? 'bg-red-500/10 text-red-400' :
            estimate.status === 'invoiced' ? 'bg-amber-500/10 text-amber-400' :
            estimate.status === 'viewed'   ? 'bg-violet-500/10 text-violet-400' :
            estimate.status === 'sent'     ? 'bg-blue-500/10 text-blue-400' :
            estimate.status === 'expired'  ? 'bg-stone-500/10 text-stone-400' :
            'bg-stone-700/30 text-stone-400'
          }`}>
            {estimate.status}
          </span>
        </div>

        {/* Action toolbar */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['draft', 'sent', 'viewed'].includes(estimate.status) && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {estimate.status === 'draft' ? 'Send to Client' : 'Resend'}
            </button>
          )}

          {['accepted', 'sent', 'viewed'].includes(estimate.status) && !estimate.invoice_id && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Convert to Invoice
            </button>
          )}

          {estimate.invoice_id && (
            <Link
              href={`/invoices/${estimate.invoice_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition"
            >
              View Invoice →
            </Link>
          )}

          {['sent', 'viewed'].includes(estimate.status) && (
            <button
              onClick={handleDecline}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-stone-400 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" /> Mark Declined
            </button>
          )}

          {/* PDF Download */}
          {PDFDownloadLink && EstimatePDF && (
            <PDFDownloadLink
              document={<EstimatePDF estimate={estimate} businessName={businessName} />}
              fileName={`${estimate.estimate_number}.pdf`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-stone-300 hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </PDFDownloadLink>
          )}

          {estimate.status === 'draft' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* View URL (for sent estimates) */}
        {displayViewUrl && ['sent', 'viewed', 'accepted', 'declined'].includes(estimate.status) && (
          <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-violet-400">
              <Eye className="h-3 w-3" /> Client view link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-stone-300">{displayViewUrl}</code>
              <button onClick={copyViewUrl} className="text-stone-400 hover:text-white transition">
                {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Estimate preview */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xl font-bold text-white">{businessName}</p>
              <p className="mt-0.5 text-xs uppercase tracking-widest text-stone-500">Estimate</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-violet-400">{estimate.estimate_number}</p>
              <p className="mt-1 text-xs text-stone-400">Issued: <span className="text-stone-300">{fmtDate(estimate.issued_date)}</span></p>
              {estimate.expiry_date && (
                <p className="text-xs text-stone-400">Valid until: <span className="text-stone-300">{fmtDate(estimate.expiry_date)}</span></p>
              )}
            </div>
          </div>

          {/* Bill to */}
          {client && (
            <div className="mb-6 rounded-lg bg-white/[0.02] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Prepared For</p>
              <p className="font-semibold text-white">{client.name}</p>
              {client.email && <p className="text-sm text-stone-400">{client.email}</p>}
              {client.phone && <p className="text-sm text-stone-400">{client.phone}</p>}
              {client.address && <p className="text-sm text-stone-400">{client.address}</p>}
            </div>
          )}

          {/* Title */}
          {estimate.title && (
            <p className="mb-4 text-base font-semibold text-white">{estimate.title}</p>
          )}

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className={`pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 ${h === 'Description' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map(li => (
                <tr key={li.id} className="border-b border-white/[0.03]">
                  <td className="py-2.5 text-stone-300">{li.description}</td>
                  <td className="py-2.5 text-right text-stone-400">{li.quantity}</td>
                  <td className="py-2.5 text-right text-stone-300">{fmt(li.unit_price_cents)}</td>
                  <td className="py-2.5 text-right text-white">{fmt(li.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex flex-col items-end gap-1">
            <div className="flex w-52 justify-between text-sm">
              <span className="text-stone-400">Subtotal</span>
              <span className="text-stone-300">{fmt(estimate.subtotal_cents)}</span>
            </div>
            {taxes.map(t => (
              <div key={t.id} className="flex w-52 justify-between text-sm">
                <span className="text-stone-400">{t.name} ({t.rate_percent}%)</span>
                <span className="text-stone-300">{fmt(t.tax_cents)}</span>
              </div>
            ))}
            {estimate.tax_cents > 0 && taxes.length === 0 && (
              <div className="flex w-52 justify-between text-sm">
                <span className="text-stone-400">Tax</span>
                <span className="text-stone-300">{fmt(estimate.tax_cents)}</span>
              </div>
            )}
            <div className="mt-2 flex w-52 justify-between border-t border-white/10 pt-2">
              <span className="font-bold text-white">Estimate Total</span>
              <span className="text-lg font-bold text-violet-400">{fmt(estimate.total_cents)}</span>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-stone-300">{estimate.notes}</p>
            </div>
          )}

          {/* Status events */}
          {(estimate.viewed_at || estimate.accepted_at || estimate.declined_at) && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Timeline</p>
              <div className="space-y-1 text-xs text-stone-400">
                {estimate.viewed_at && (
                  <p className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Viewed {new Date(estimate.viewed_at).toLocaleString()}</p>
                )}
                {estimate.accepted_at && (
                  <p className="flex items-center gap-1.5 text-green-400"><Check className="h-3 w-3" /> Accepted {new Date(estimate.accepted_at).toLocaleString()}</p>
                )}
                {estimate.declined_at && (
                  <p className="flex items-center gap-1.5 text-red-400"><X className="h-3 w-3" /> Declined {new Date(estimate.declined_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
