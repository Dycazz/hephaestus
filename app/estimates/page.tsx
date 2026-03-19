'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileEdit, Plus, Loader2, Check,
  Eye, SendHorizonal, XCircle, Clock, RefreshCw,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'
import type { Estimate, EstimateStatus } from '@/types'

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:    { label: 'Draft',    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: FileEdit    },
  sent:     { label: 'Sent',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: SendHorizonal },
  viewed:   { label: 'Viewed',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Eye          },
  accepted: { label: 'Accepted', color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: Check        },
  declined: { label: 'Declined', color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle      },
  expired:  { label: 'Expired',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: Clock        },
  invoiced: { label: 'Invoiced', color: '#d97706', bg: 'rgba(217,119,6,0.12)',   icon: RefreshCw    },
}

function StatusBadge({ status }: { status: EstimateStatus }) {
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
  { key: 'viewed', label: 'Viewed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'expired', label: 'Expired' },
  { key: 'invoiced', label: 'Invoiced' },
]

export default function EstimatesPage() {
  const { org } = useOrg()
  const router = useRouter()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  // Redirect trial orgs
  useEffect(() => {
    if (org && org.plan === 'trial') {
      router.push('/settings?upgrade=estimates')
    }
  }, [org, router])

  const loadEstimates = useCallback(async () => {
    setLoading(true)
    const url = filter ? `/api/estimates?status=${filter}` : '/api/estimates'
    const res = await fetch(url)
    const json = await res.json()
    setEstimates(json.estimates ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadEstimates() }, [loadEstimates])

  // Summary stats
  const pending_cents = estimates
    .filter(e => ['sent', 'viewed'].includes(e.status))
    .reduce((s, e) => s + e.total_cents, 0)
  const accepted_cents = estimates
    .filter(e => e.status === 'accepted')
    .reduce((s, e) => s + e.total_cents, 0)
  const declined_count = estimates.filter(e => e.status === 'declined').length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Estimates</h1>
            <p className="mt-0.5 text-sm text-stone-400">Quotes and proposals for clients</p>
          </div>
          <Link
            href="/estimates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </Link>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Pending Response', value: fmt(pending_cents), color: '#60a5fa' },
            { label: 'Accepted Value', value: fmt(accepted_cents), color: '#4ade80' },
            { label: 'Declined', value: String(declined_count), color: '#f87171' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-xs font-medium text-stone-400">{card.label}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filter === f.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/[0.05] text-stone-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : estimates.length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <FileEdit className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="font-medium">No estimates yet</p>
              <p className="mt-1 text-sm">Create your first estimate to send to a client.</p>
              <Link
                href="/estimates/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> New Estimate
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Estimate #', 'Client', 'Title', 'Issued', 'Expires', 'Total', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estimates.map(est => (
                  <tr
                    key={est.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition cursor-pointer"
                    onClick={() => router.push(`/estimates/${est.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-violet-400">{est.estimate_number}</td>
                    <td className="px-4 py-3 text-white">
                      {(est as unknown as { clients?: { name: string } }).clients?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 max-w-[160px] truncate">
                      {est.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-300">{fmtDate(est.issued_date)}</td>
                    <td className="px-4 py-3 text-stone-300">
                      {est.expiry_date ? fmtDate(est.expiry_date) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{fmt(est.total_cents)}</td>
                    <td className="px-4 py-3"><StatusBadge status={est.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/estimates/${est.id}`}
                        className="text-xs text-stone-500 hover:text-white"
                        onClick={e => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
