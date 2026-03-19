/**
 * Public estimate view page — no authentication required.
 * Clients click a link from their email to view and accept/decline.
 */

'use client'

import { use, useEffect, useState } from 'react'
import { Check, X, Loader2, AlertCircle } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

interface EstimateTax {
  id: string
  name: string
  rate_percent: number
  tax_cents: number
}

interface PublicEstimate {
  id: string
  estimate_number: string
  title: string | null
  status: string
  issued_date: string
  expiry_date: string | null
  notes: string | null
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  viewed_at: string | null
  accepted_at: string | null
  declined_at: string | null
  clients?: { name: string; email: string | null; phone: string; address: string }
  organizations?: { name: string }
  estimate_line_items?: LineItem[]
  estimate_taxes?: EstimateTax[]
}

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

type PageProps = { params: Promise<{ token: string }> }

export default function PublicEstimateViewPage({ params }: PageProps) {
  const { token } = use(params)
  const [estimate, setEstimate] = useState<PublicEstimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [actionDone, setActionDone] = useState<'accept' | 'decline' | null>(null)

  useEffect(() => {
    fetch(`/api/estimates/public/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.estimate) setEstimate(json.estimate)
        else setError(json.error ?? 'Estimate not found')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load estimate'); setLoading(false) })
  }, [token])

  async function act(action: 'accept' | 'decline') {
    setActing(true)
    const res = await fetch(`/api/estimates/public/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    setActing(false)
    if (res.ok) {
      setActionDone(action)
      setEstimate(e => e ? { ...e, status: action === 'accept' ? 'accepted' : 'declined' } : e)
    } else {
      setError(json.error ?? 'Action failed')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (error || !estimate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-red-400" />
        <p className="text-lg font-semibold text-white">Estimate Not Found</p>
        <p className="mt-2 text-sm text-stone-400">{error ?? 'This estimate link is invalid or has expired.'}</p>
      </div>
    )
  }

  const businessName = estimate.organizations?.name ?? 'Your Service Provider'
  const clientName = estimate.clients?.name ?? 'Valued Client'
  const lineItems = estimate.estimate_line_items ?? []
  const taxes = estimate.estimate_taxes ?? []

  const canAct = ['sent', 'viewed'].includes(estimate.status)
  const isExpired = estimate.expiry_date && new Date(estimate.expiry_date + 'T23:59:59') < new Date()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">

        {/* Business header */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold text-white">{businessName}</p>
          <p className="mt-1 text-sm text-stone-400 uppercase tracking-widest">Estimate</p>
        </div>

        {/* Action done banner */}
        {actionDone === 'accept' && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
            <Check className="mx-auto mb-1 h-6 w-6 text-green-400" />
            <p className="font-semibold text-green-400">Estimate Accepted</p>
            <p className="text-sm text-stone-400">We'll be in touch to schedule your service.</p>
          </div>
        )}
        {actionDone === 'decline' && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <X className="mx-auto mb-1 h-6 w-6 text-red-400" />
            <p className="font-semibold text-red-400">Estimate Declined</p>
            <p className="text-sm text-stone-400">Please contact us if you have questions or want to discuss further.</p>
          </div>
        )}

        {estimate.status === 'accepted' && !actionDone && (
          <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center text-sm text-green-400">
            <Check className="inline h-4 w-4 mr-1" /> You accepted this estimate
          </div>
        )}
        {estimate.status === 'declined' && !actionDone && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-sm text-red-400">
            <X className="inline h-4 w-4 mr-1" /> This estimate was declined
          </div>
        )}
        {estimate.status === 'invoiced' && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-sm text-amber-400">
            This estimate has been converted to an invoice.
          </div>
        )}

        {/* Expiry warning */}
        {isExpired && canAct && (
          <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
            This estimate expired on {fmtDate(estimate.expiry_date!)}. Contact us to request an updated estimate.
          </div>
        )}

        {/* Estimate card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">

          {/* Header row */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-violet-400">{estimate.estimate_number}</p>
              {estimate.title && <p className="mt-1 text-base font-semibold text-white">{estimate.title}</p>}
            </div>
            <div className="text-right text-sm text-stone-400">
              <p>Issued: <span className="text-stone-300">{fmtDate(estimate.issued_date)}</span></p>
              {estimate.expiry_date && (
                <p className={isExpired ? 'text-orange-400' : ''}>
                  Valid until: <span>{fmtDate(estimate.expiry_date)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Client name */}
          <div className="mb-6 rounded-lg bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Prepared For</p>
            <p className="mt-1 font-semibold text-white">{clientName}</p>
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">Description</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">Qty</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">Price</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(li => (
                <tr key={li.id} className="border-b border-white/[0.03]">
                  <td className="py-2.5 text-stone-200">{li.description}</td>
                  <td className="py-2.5 text-right text-stone-400">{li.quantity}</td>
                  <td className="py-2.5 text-right text-stone-300">{fmt(li.unit_price_cents)}</td>
                  <td className="py-2.5 text-right text-white">{fmt(li.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex flex-col items-end gap-1">
            <div className="flex w-48 justify-between text-sm">
              <span className="text-stone-400">Subtotal</span>
              <span className="text-stone-300">{fmt(estimate.subtotal_cents)}</span>
            </div>
            {taxes.map(t => (
              <div key={t.id} className="flex w-48 justify-between text-sm">
                <span className="text-stone-400">{t.name}</span>
                <span className="text-stone-300">{fmt(t.tax_cents)}</span>
              </div>
            ))}
            {estimate.tax_cents > 0 && taxes.length === 0 && (
              <div className="flex w-48 justify-between text-sm">
                <span className="text-stone-400">Tax</span>
                <span className="text-stone-300">{fmt(estimate.tax_cents)}</span>
              </div>
            )}
            <div className="mt-2 flex w-48 justify-between border-t border-white/10 pt-2">
              <span className="font-bold text-white">Total</span>
              <span className="text-xl font-bold text-violet-400">{fmt(estimate.total_cents)}</span>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-stone-300">{estimate.notes}</p>
            </div>
          )}
        </div>

        {/* Accept / Decline buttons */}
        {canAct && !actionDone && !isExpired && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => act('decline')}
              disabled={acting}
              className="rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {acting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2"><X className="h-4 w-4" /> Decline</span>
              )}
            </button>
            <button
              onClick={() => act('accept')}
              disabled={acting}
              className="rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 transition disabled:opacity-50"
            >
              {acting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : (
                <span className="flex items-center justify-center gap-2"><Check className="h-4 w-4" /> Accept Estimate</span>
              )}
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-stone-600">
          Questions? Reply to the email or contact {businessName} directly.
        </p>
      </div>
    </div>
  )
}
