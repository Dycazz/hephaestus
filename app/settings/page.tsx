'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Settings2, Layers, CreditCard, Save, Loader2,
  Check, Plus, Trash2, Edit2, X, Star, ExternalLink,
  Zap, Shield, Building2, Gift, AlertTriangle, RefreshCw, Clock,
  Globe, DollarSign, Copy, Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgData {
  id: string
  businessName: string | null
  slug: string
  plan: 'trial' | 'starter' | 'pro' | 'enterprise' | 'gifted'
  reviewUrl: string | null
  twilioPhoneNumber?: string | null
  reminderHoursBefore: number
  createdAt: string
  // Subscription fields
  stripeCustomerId: string | null
  subscriptionStatus: string | null      // 'active' | 'past_due' | 'canceled' | null
  subscriptionPeriodEnd: string | null
  trialEndsAt: string | null
}

interface Service {
  id: string
  name: string
  icon: string
  color: string
  prep_templates: string[]
  is_active: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  '🔧', '🔩', '🪛', '❄️', '⚡', '🔥', '💧', '🚿', '🪠',
  '🏗️', '🪟', '🔌', '🪜', '🧰', '🌡️', '🔋', '🏠', '🧹',
  '🌿', '🛁', '🔑', '⚙️', '🛠️', '📦', '🌬️',
]

const COLOR_OPTIONS: { name: string; value: string; hex: string }[] = [
  { name: 'Blue',    value: 'blue',    hex: '#3b82f6' },
  { name: 'Cyan',    value: 'cyan',    hex: '#06b6d4' },
  { name: 'Emerald', value: 'emerald', hex: '#10b981' },
  { name: 'Teal',    value: 'teal',    hex: '#14b8a6' },
  { name: 'Indigo',  value: 'indigo',  hex: '#6366f1' },
  { name: 'Purple',  value: 'purple',  hex: '#a855f7' },
  { name: 'Orange',  value: 'orange',  hex: '#d97706' },
  { name: 'Yellow',  value: 'yellow',  hex: '#eab308' },
  { name: 'Red',     value: 'red',     hex: '#ef4444' },
  { name: 'Pink',    value: 'pink',    hex: '#ec4899' },
]

// Plan display data — pricing matches Stripe products
const PLAN_FEATURES = {
  trial:      { label: 'Free Trial',   color: '#94a3b8', price: null,  jobs: '25 jobs',    sms: '50 SMS',      techs: '2 techs'       },
  starter:    { label: 'Starter',      color: '#3b82f6', price: 24.99, jobs: '200 jobs',   sms: '500 SMS',     techs: '3 techs'       },
  pro:        { label: 'Pro',          color: '#a855f7', price: 49.99, jobs: 'Unlimited',  sms: 'Unlimited',   techs: '5 techs'       },
  enterprise: { label: 'Enterprise',   color: '#f59e0b', price: 99.99, jobs: 'Unlimited',  sms: 'Unlimited',   techs: 'Unlimited'     },
  gifted:     { label: 'Gifted',       color: '#10b981', price: null,  jobs: 'Unlimited',  sms: 'Unlimited',   techs: 'Unlimited'     },
} as const

// Tiers shown as upgrade options
const UPGRADE_TIERS: ('starter' | 'pro' | 'enterprise')[] = ['starter', 'pro', 'enterprise']

// Plan tier rank for comparison
const PLAN_RANK: Record<string, number> = {
  trial: 0, starter: 1, pro: 2, enterprise: 3, gifted: 4,
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-60"
      style={{ background: saved ? '#f59e0b' : '#d97706', color: 'black' }}
    >
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
    </button>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/70 p-6"
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/50 mb-1.5">{children}</label>
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
    />
  )
}

// ── Service Form ───────────────────────────────────────────────────────────

function ServiceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Service>
  onSave: (data: { name: string; icon: string; color: string; prepTemplates: string[] }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '🔧')
  const [color, setColor] = useState(initial?.color ?? 'blue')
  const [templates, setTemplates] = useState<string[]>(initial?.prep_templates ?? [])
  const [newTemplate, setNewTemplate] = useState('')

  const addTemplate = () => {
    const t = newTemplate.trim()
    if (t) { setTemplates(p => [...p, t]); setNewTemplate('') }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Service name</FieldLabel>
          <TextInput value={name} onChange={setName} placeholder="e.g. Plumbing" />
        </div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-600/60 bg-slate-800/80" style={{ maxHeight: 80, overflowY: 'auto' }}>
            {ICON_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${icon === e ? 'ring-2 ring-blue-500 scale-110' : 'hover:bg-slate-700'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Color</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.name}
              className={`w-7 h-7 rounded-full transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Default prep checklist (optional)</FieldLabel>
        <div className="space-y-1.5 mb-2">
          {templates.map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-700/30 bg-amber-900/20">
              <span className="text-xs text-amber-200 flex-1">{t}</span>
              <button type="button" onClick={() => setTemplates(p => p.filter((_, j) => j !== i))}>
                <X className="w-3.5 h-3.5 text-amber-500/60 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newTemplate}
            onChange={e => setNewTemplate(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTemplate())}
            placeholder="Add checklist item…"
            className="flex-1 bg-slate-800/80 border border-slate-600/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500/60"
          />
          <button
            type="button"
            onClick={addTemplate}
            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({ name, icon, color, prepTemplates: templates })}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial?.id ? 'Update service' : 'Add service'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors border border-white/8 hover:border-white/15"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Plan Tab ───────────────────────────────────────────────────────────────

function PlanTab({ org, role }: { org: OrgData; role: string }) {
  const [billingLoading, setBillingLoading] = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)

  const planInfo = PLAN_FEATURES[org.plan]
  const currentRank = PLAN_RANK[org.plan] ?? 0
  const isOwner = role === 'owner'
  const isGifted = org.plan === 'gifted'

  const isActivePaidPlan =
    (org.plan === 'starter' || org.plan === 'pro' || org.plan === 'enterprise') &&
    (() => {
      const status = org.subscriptionStatus
      const periodEnd = org.subscriptionPeriodEnd ? new Date(org.subscriptionPeriodEnd) : null
      const isStatusActive = status === 'active' || status === 'trialing'
      const isPeriodValid = !periodEnd || periodEnd > new Date()
      return (status ? isStatusActive : true) && isPeriodValid
    })()

  const isPastDue =
    (org.plan === 'starter' || org.plan === 'pro' || org.plan === 'enterprise') &&
    org.subscriptionStatus === 'past_due'

  const isExpiredPaid =
    (org.plan === 'starter' || org.plan === 'pro' || org.plan === 'enterprise') &&
    !isActivePaidPlan && !isPastDue

  const trialActive =
    org.plan === 'trial' &&
    !!org.trialEndsAt &&
    new Date(org.trialEndsAt) > new Date()

  const trialExpired = org.plan === 'trial' && !trialActive

  // Upgrade: redirect to Stripe Checkout
  const handleUpgrade = async (planKey: 'starter' | 'pro' | 'enterprise') => {
    if (!isOwner) return
    setBillingError(null)
    setBillingLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const json = await res.json()
      if (!res.ok) { setBillingError(json.error ?? 'Failed to start checkout'); return }
      if (json.url) window.location.href = json.url
    } catch {
      setBillingError('Something went wrong. Please try again.')
    } finally {
      setBillingLoading(null)
    }
  }

  // Manage billing: redirect to Stripe Portal
  const handleManageBilling = async () => {
    if (!isOwner) return
    setBillingError(null)
    setBillingLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setBillingError(json.error ?? 'Failed to open billing portal'); return }
      if (json.url) window.location.href = json.url
    } catch {
      setBillingError('Something went wrong. Please try again.')
    } finally {
      setBillingLoading(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Current Plan Card ── */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Current plan</h2>
        </div>

        {/* Plan header row */}
        <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${planInfo.color}20`, border: `1px solid ${planInfo.color}40` }}
          >
            {isGifted
              ? <Gift className="w-5 h-5" style={{ color: planInfo.color }} />
              : <Zap  className="w-5 h-5" style={{ color: planInfo.color }} />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-white">{planInfo.label}</p>
              {planInfo.price != null && (
                <span className="text-sm font-semibold text-slate-400">${planInfo.price}/mo</span>
              )}
              {isGifted && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  Complimentary
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Member since {new Date(org.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Status badge */}
          {org.plan === 'trial' && trialActive && (
            <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20 shrink-0">
              Trial active
            </span>
          )}
          {org.plan === 'trial' && trialExpired && (
            <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
              Trial expired
            </span>
          )}
          {isActivePaidPlan && (
            <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20 shrink-0">
              Active
            </span>
          )}
          {isPastDue && (
            <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
              Payment past due
            </span>
          )}
          {isExpiredPaid && (
            <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20 shrink-0">
              Expired
            </span>
          )}
        </div>

        {/* Renewal / trial expiry info */}
        {isActivePaidPlan && org.subscriptionPeriodEnd && (
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            Renews {new Date(org.subscriptionPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {org.plan === 'trial' && trialActive && org.trialEndsAt && (
          <p className="text-xs text-amber-500/70 mt-3">
            Trial ends {new Date(org.trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        {/* Usage limits grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Jobs / month', value: planInfo.jobs  },
            { label: 'SMS credits',  value: planInfo.sms   },
            { label: 'Technicians',  value: planInfo.techs },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl border text-center" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-base font-bold text-white">{item.value}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Past due warning banner */}
        {isPastDue && (
          <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/20">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Payment failed</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Your last payment didn&apos;t go through. Update your payment method to keep your plan active.
              </p>
              {isOwner && (
                <button
                  onClick={handleManageBilling}
                  disabled={!!billingLoading}
                  className="mt-2 text-xs font-semibold text-red-300 hover:text-red-200 underline underline-offset-2 disabled:opacity-50"
                >
                  {billingLoading === 'portal' ? 'Opening…' : 'Update payment method →'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expired paid plan notice */}
        {isExpiredPaid && (
          <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl border border-amber-700/30 bg-amber-900/15">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Subscription ended</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Your {planInfo.label} subscription has ended. You&apos;re now on trial limits. Re-subscribe below to restore full access.
              </p>
            </div>
          </div>
        )}

        {/* Manage billing button */}
        {(isActivePaidPlan || isPastDue) && isOwner && (
          <button
            onClick={handleManageBilling}
            disabled={!!billingLoading}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          >
            {billingLoading === 'portal'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening billing portal…</>
              : <><CreditCard className="w-4 h-4" /> Manage billing</>
            }
          </button>
        )}

        {/* Non-owner notice */}
        {!isOwner && (
          <p className="text-xs text-slate-600 mt-4">
            Only org owners can manage billing. Contact your owner to upgrade.
          </p>
        )}
      </SectionCard>

      {/* ── Upgrade / Subscribe Cards ── */}
      {!isGifted && !isActivePaidPlan && !isPastDue && isOwner && (
        <SectionCard>
          <h2 className="text-sm font-semibold text-white mb-1">
            {trialExpired || isExpiredPaid ? 'Subscribe to restore access' : 'Upgrade your plan'}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            All plans are billed monthly. Cancel anytime from the billing portal.
          </p>

          {billingError && (
            <div className="mb-4 px-3 py-2.5 rounded-lg border border-red-700/40 bg-red-900/20 text-xs text-red-400">
              {billingError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {UPGRADE_TIERS
              .filter(p => isExpiredPaid || PLAN_RANK[p] > currentRank)
              .map(p => {
                const info = PLAN_FEATURES[p]
                const isLoading = billingLoading === p
                return (
                  <div
                    key={p}
                    className="p-4 rounded-xl border flex flex-col transition-all"
                    style={{ borderColor: `${info.color}30`, background: `${info.color}08` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${info.color}20` }}>
                        <Zap className="w-4 h-4" style={{ color: info.color }} />
                      </div>
                      <span className="text-sm font-bold text-white">{info.label}</span>
                    </div>
                    <p className="text-xl font-bold mb-3" style={{ color: info.color }}>
                      ${info.price}
                      <span className="text-xs text-slate-500 font-normal">/mo</span>
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-500 mb-4 flex-1">
                      {[`${info.jobs} / month`, `${info.sms} SMS`, `${info.techs} techs`].map(f => (
                        <li key={f} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 shrink-0" style={{ color: info.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgrade(p)}
                      disabled={!!billingLoading}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}30` }}
                    >
                      {isLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting…</>
                        : `Subscribe to ${info.label}`
                      }
                    </button>
                  </div>
                )
              })}
          </div>

          <p className="text-[11px] text-slate-600 mt-3 text-center">
            Secure checkout powered by Stripe · No hidden fees
          </p>
        </SectionCard>
      )}

      {/* ── Gifted plan info ── */}
      {isGifted && (
        <SectionCard>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#10b98120', border: '1px solid #10b98140' }}>
              <Gift className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Complimentary access</p>
              <p className="text-xs text-slate-500 mt-1">
                Your organization has been granted complimentary full-feature access by the Hephaestus team.
                No payment is required.
              </p>
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  )
}

// ── Booking Portal Tab ─────────────────────────────────────────────────────

interface BPortalService {
  id: string
  name: string
  description: string
  duration_minutes: number
  price_cents: number
  display_order: number
  is_active: boolean
}

interface DayAvailability {
  enabled: boolean
  start: string
  end: string
}

interface BookingPortalLink {
  id: string
  slug: string
  business_name: string
  business_phone: string
  accent_color: string
  show_pricing: boolean
  require_customer_email: boolean
  require_customer_phone: boolean
  booking_window_days: number
  slot_duration_minutes: number
  is_active: boolean
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_AVAILABILITY: Record<number, DayAvailability> = {
  0: { enabled: false, start: '09:00', end: '17:00' },
  1: { enabled: true,  start: '09:00', end: '17:00' },
  2: { enabled: true,  start: '09:00', end: '17:00' },
  3: { enabled: true,  start: '09:00', end: '17:00' },
  4: { enabled: true,  start: '09:00', end: '17:00' },
  5: { enabled: true,  start: '09:00', end: '17:00' },
  6: { enabled: false, start: '09:00', end: '17:00' },
}

const ACCENT_COLORS = [
  { label: 'Orange', value: '#d97706' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Pink',   value: '#ec4899' },
]

function BookingServiceForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (data: { name: string; description: string; duration_minutes: number; price_cents: number }) => void
  onCancel: () => void
  initial?: Partial<BPortalService>
}) {
  const [name, setName]               = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [duration, setDuration]       = useState(initial?.duration_minutes ?? 60)
  const [price, setPrice]             = useState(initial?.price_cents ? (initial.price_cents / 100).toFixed(2) : '0.00')

  return (
    <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/5">
      <div>
        <FieldLabel>Service Name</FieldLabel>
        <TextInput value={name} onChange={setName} placeholder="e.g. Haircut, Oil Change…" />
      </div>
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <TextInput value={description} onChange={setDescription} placeholder="Brief description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Duration</FieldLabel>
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30"
          >
            {[15,30,45,60,90,120,180,240].map(m => (
              <option key={m} value={m}>{m < 60 ? `${m}min` : `${m/60}hr${m > 60 ? 's' : ''}`}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Price ($)</FieldLabel>
          <TextInput
            type="number"
            value={price}
            onChange={setPrice}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({ name, description, duration_minutes: duration, price_cents: Math.round(parseFloat(price || '0') * 100) })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
          style={{ background: '#2563eb', color: 'white' }}
        >
          <Save className="w-4 h-4" /> Save Service
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function BookingPortalTab({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  const [portal, setPortal]           = useState<BookingPortalLink | null>(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [copied, setCopied]           = useState(false)

  // Portal form fields
  const [businessName, setBusinessName]   = useState(orgName)
  const [businessPhone, setBusinessPhone] = useState('')
  const [accentColor, setAccentColor]     = useState('#d97706')
  const [showPricing, setShowPricing]     = useState(true)
  const [requireEmail, setRequireEmail]   = useState(true)
  const [requirePhone, setRequirePhone]   = useState(true)
  const [windowDays, setWindowDays]       = useState(30)
  const [slotDuration, setSlotDuration]   = useState(60)

  // Services
  const [services, setServices]           = useState<BPortalService[]>([])
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingService, setEditingService]   = useState<BPortalService | null>(null)

  // Availability
  const [availability, setAvailability]   = useState<Record<number, DayAvailability>>(DEFAULT_AVAILABILITY)
  const [savingAvail, setSavingAvail]     = useState(false)
  const [savedAvail, setSavedAvail]       = useState(false)

  // Load portal on mount
  useEffect(() => {
    fetch('/api/booking-portal')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.portal) {
          const p: BookingPortalLink = data.portal
          setPortal(p)
          setBusinessName(p.business_name)
          setBusinessPhone(p.business_phone ?? '')
          setAccentColor(p.accent_color)
          setShowPricing(p.show_pricing)
          setRequireEmail(p.require_customer_email)
          setRequirePhone(p.require_customer_phone)
          setWindowDays(p.booking_window_days)
          setSlotDuration(p.slot_duration_minutes)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load services & availability once portal exists
  useEffect(() => {
    if (!portal) return
    fetch('/api/booking-portal/services').then(r => r.ok ? r.json() : null).then(d => d?.services && setServices(d.services))
    fetch('/api/booking-portal/availability').then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.availability?.length) return
      const map: Record<number, DayAvailability> = { ...DEFAULT_AVAILABILITY }
      d.availability.forEach((a: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }) => {
        map[a.day_of_week] = { enabled: a.is_active, start: a.start_time.slice(0,5), end: a.end_time.slice(0,5) }
      })
      setAvailability(map)
    })
  }, [portal])

  const slug = portal?.slug || orgSlug
  const portalUrl = `https://hephaestus.work/book/${slug}`

  async function handleSavePortal() {
    setSaving(true)
    const body = { business_name: businessName, business_phone: businessPhone, accent_color: accentColor, show_pricing: showPricing, require_customer_email: requireEmail, require_customer_phone: requirePhone, booking_window_days: windowDays, slot_duration_minutes: slotDuration }
    const res = portal
      ? await fetch('/api/booking-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/booking-portal', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const d = await res.json()
      setPortal(d.portal)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleAddService(data: { name: string; description: string; duration_minutes: number; price_cents: number }) {
    const res = await fetch('/api/booking-portal/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) {
      const d = await res.json()
      setServices(prev => [...prev, d.service])
      setShowServiceForm(false)
    }
  }

  async function handleEditService(id: string, data: { name: string; description: string; duration_minutes: number; price_cents: number }) {
    const res = await fetch(`/api/booking-portal/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) {
      const d = await res.json()
      setServices(prev => prev.map(s => s.id === id ? d.service : s))
      setEditingService(null)
    }
  }

  async function handleDeleteService(id: string) {
    const res = await fetch(`/api/booking-portal/services/${id}`, { method: 'DELETE' })
    if (res.ok) setServices(prev => prev.filter(s => s.id !== id))
  }

  async function handleSaveAvailability() {
    setSavingAvail(true)
    const slots = Object.entries(availability)
      .filter(([, v]) => v.enabled)
      .map(([day, v]) => ({ day_of_week: Number(day), start_time: v.start, end_time: v.end }))
    const res = await fetch('/api/booking-portal/availability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slots }) })
    if (res.ok) { setSavedAvail(true); setTimeout(() => setSavedAvail(false), 2000) }
    setSavingAvail(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>

  return (
    <div className="space-y-5">

      {/* Portal URL — always visible */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Your Booking Link</h2>
          {portal ? (
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Live</span>
          ) : (
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">Not active</span>
          )}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-sm text-slate-300 truncate flex-1 font-mono">{portalUrl}</span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border"
            style={{
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
              borderColor: copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
              color: copied ? '#34d399' : '#cbd5e1',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {portal && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          )}
        </div>
        {!portal && (
          <p className="text-xs text-slate-500 mt-2">Create your portal below to activate this link.</p>
        )}
      </SectionCard>

      {/* Portal Settings */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Portal Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <FieldLabel>Business Name</FieldLabel>
            <TextInput value={businessName} onChange={setBusinessName} placeholder="Your business name" />
          </div>
          <div>
            <FieldLabel>Business Phone (optional)</FieldLabel>
            <TextInput value={businessPhone} onChange={setBusinessPhone} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <FieldLabel>Accent Color</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{ background: c.value, borderColor: accentColor === c.value ? 'white' : 'transparent' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Booking Window (days)</FieldLabel>
              <select value={windowDays} onChange={e => setWindowDays(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30">
                {[7,14,21,30,45,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Slot Duration</FieldLabel>
              <select value={slotDuration} onChange={e => setSlotDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30">
                {[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m/60} hr`}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showPricing} onChange={e => setShowPricing(e.target.checked)} className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm text-slate-300">Show pricing on portal</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={requireEmail} onChange={e => setRequireEmail(e.target.checked)} className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm text-slate-300">Require customer email</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={requirePhone} onChange={e => setRequirePhone(e.target.checked)} className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm text-slate-300">Require customer phone</span>
            </label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleSavePortal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-60"
            style={{ background: saved ? '#059669' : '#2563eb', color: 'white' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : (portal ? 'Save Changes' : 'Create Portal')}
          </button>
        </div>
      </SectionCard>

      {/* Services — only show after portal is created */}
      {portal && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-white">Services</h2>
          </div>
          <div className="space-y-3">
            {services.map(svc => (
              editingService?.id === svc.id ? (
                <BookingServiceForm
                  key={svc.id}
                  initial={svc}
                  onSave={data => handleEditService(svc.id, data)}
                  onCancel={() => setEditingService(null)}
                />
              ) : (
                <div key={svc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{svc.name}</p>
                    <p className="text-xs text-slate-400">{svc.duration_minutes}min{svc.price_cents > 0 ? ` · $${(svc.price_cents/100).toFixed(2)}` : ' · Free'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingService(svc)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteService(svc.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )
            ))}
            {showServiceForm ? (
              <BookingServiceForm onSave={handleAddService} onCancel={() => setShowServiceForm(false)} />
            ) : (
              <button onClick={() => setShowServiceForm(true)} className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 text-sm text-slate-400 hover:text-white hover:border-white/40 transition-all">
                <Plus className="w-4 h-4" /> Add Service
              </button>
            )}
          </div>
        </SectionCard>
      )}

      {/* Weekly Availability — only show after portal is created */}
      {portal && (
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-white">Weekly Availability</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(availability).map(([dayStr, val]) => {
              const day = Number(dayStr)
              return (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={val.enabled}
                      onChange={e => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], enabled: e.target.checked } }))}
                      className="w-4 h-4 rounded accent-orange-500"
                    />
                    <span className={`text-sm ${val.enabled ? 'text-white' : 'text-slate-500'}`}>{DAY_NAMES[day]}</span>
                  </label>
                  {val.enabled && (
                    <div className="flex items-center gap-2 text-sm">
                      <input type="time" value={val.start} onChange={e => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30" />
                      <span className="text-slate-500">to</span>
                      <input type="time" value={val.end} onChange={e => setAvailability(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-white/30" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={savingAvail}
              onClick={handleSaveAvailability}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-60"
              style={{ background: savedAvail ? '#059669' : '#2563eb', color: 'white' }}
            >
              {savingAvail ? <Loader2 className="w-4 h-4 animate-spin" /> : savedAvail ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savingAvail ? 'Saving…' : savedAvail ? 'Saved!' : 'Save Schedule'}
            </button>
          </div>
        </SectionCard>
      )}

    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = 'general' | 'services' | 'plan' | 'booking'

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('general')

  // Org state
  const [org, setOrg] = useState<OrgData | null>(null)
  const [role, setRole] = useState<string>('viewer')
  const [orgLoading, setOrgLoading] = useState(true)

  // Delete org state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // General form
  const [businessName, setBusinessName] = useState('')
  const [reviewUrl, setReviewUrl] = useState('')
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24)
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalSaved, setGeneralSaved] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Services state
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [addingService, setAddingService] = useState(false)
  const [serviceSaving, setServiceSaving] = useState(false)
  const [serviceError, setServiceError] = useState<string | null>(null)

  // Check for checkout redirect in URL params and switch to plan tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'plan') {
      setActiveTab('plan')
      // Clean up the URL
      window.history.replaceState({}, '', '/settings?tab=plan')
    }
  }, [])

  // Load org on mount
  useEffect(() => {
    fetch('/api/org')
      .then(r => r.json())
      .then(({ org: o, role: r }) => {
        if (o) {
          setOrg({
            id: o.id,
            businessName: o.business_name,
            slug: o.slug,
            plan: o.plan,
            reviewUrl: o.review_url,
            twilioPhoneNumber: o.twilio_phone_number,
            reminderHoursBefore: o.reminder_hours_before ?? 24,
            createdAt: o.created_at,
            stripeCustomerId: o.stripe_customer_id ?? null,
            subscriptionStatus: o.subscription_status ?? null,
            subscriptionPeriodEnd: o.subscription_period_end ?? null,
            trialEndsAt: o.trial_ends_at ?? null,
          })
          setBusinessName(o.business_name ?? '')
          setReviewUrl(o.review_url ?? '')
          setReminderHoursBefore(o.reminder_hours_before ?? 24)
        }
        setRole(r ?? 'viewer')
      })
      .finally(() => setOrgLoading(false))
  }, [])

  // Load services when tab is active
  useEffect(() => {
    if (activeTab !== 'services' || servicesLoaded) return
    setServicesLoading(true)
    fetch('/api/services')
      .then(r => r.json())
      .then(({ services: s }) => setServices(s ?? []))
      .finally(() => { setServicesLoading(false); setServicesLoaded(true) })
  }, [activeTab, servicesLoaded])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSaveGeneral = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralSaving(true)
    setGeneralError(null)
    try {
      const res = await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, reviewUrl, reminderHoursBefore }),
      })
      const json = await res.json()
      if (!res.ok) { setGeneralError(json.error ?? 'Failed to save'); return }
      setOrg(prev => prev ? {
        ...prev,
        businessName: json.org.business_name,
        reviewUrl: json.org.review_url,
        reminderHoursBefore: json.org.reminder_hours_before ?? 24,
      } : prev)
      setGeneralSaved(true)
      setTimeout(() => setGeneralSaved(false), 2500)
    } finally {
      setGeneralSaving(false)
    }
  }, [businessName, reviewUrl, reminderHoursBefore])

  const handleDeleteOrg = useCallback(async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/org', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { setDeleteError(json.error ?? 'Failed to delete organization'); return }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } finally {
      setDeleting(false)
    }
  }, [router])

  const handleAddService = useCallback(async (data: { name: string; icon: string; color: string; prepTemplates: string[] }) => {
    setServiceSaving(true)
    setServiceError(null)
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok) {
        setServices(p => [...p, json.service])
        setAddingService(false)
      } else {
        setServiceError(json.error ?? 'Failed to add service. Please try again.')
      }
    } catch {
      setServiceError('Network error. Please try again.')
    } finally {
      setServiceSaving(false)
    }
  }, [])

  const handleUpdateService = useCallback(async (data: { name: string; icon: string; color: string; prepTemplates: string[] }) => {
    if (!editingService) return
    setServiceSaving(true)
    setServiceError(null)
    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok) {
        setServices(p => p.map(s => s.id === editingService.id ? json.service : s))
        setEditingService(null)
      } else {
        setServiceError(json.error ?? 'Failed to update service. Please try again.')
      }
    } catch {
      setServiceError('Network error. Please try again.')
    } finally {
      setServiceSaving(false)
    }
  }, [editingService])

  const handleDeleteService = useCallback(async (id: string) => {
    if (!confirm('Remove this service? It won\'t appear in new appointments.')) return
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' })
    if (res.ok) setServices(p => p.filter(s => s.id !== id))
  }, [])

  // ── Tabs ────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'general',  label: 'General',  icon: Settings2  },
    { id: 'services', label: 'Services', icon: Layers     },
    { id: 'plan',     label: 'Plan',     icon: CreditCard },
    { id: 'booking',  label: 'Booking Portal', icon: Globe },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <header className="border-b border-white/10 bg-black/90">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Settings2 className="w-3.5 h-3.5 text-orange-300" />
              </div>
              <span className="text-sm font-semibold text-white/90">Settings</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Hephaestus" width={28} height={28} className="rounded-lg bg-white p-0.5" />
            <span className="text-sm font-bold text-white/80 hidden sm:block">
              {org?.businessName ?? 'Hephaestus'}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {orgLoading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 text-blue-500/60 animate-spin" />
            <span className="text-sm text-slate-600">Loading settings…</span>
          </div>
        ) : (
          <div className="flex gap-6">

            {/* Sidebar */}
            <aside className="w-44 shrink-0">
              <nav className="flex flex-col gap-0.5">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                        activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                      style={activeTab === tab.id ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' } : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>

              {/* Role badge */}
              <div className="mt-6 px-3 py-2.5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1">Your role</p>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400/70" />
                  <span className="text-xs font-semibold text-blue-300/80 capitalize">{role}</span>
                </div>
              </div>
            </aside>

            {/* Content */}
            <main className="flex-1 min-w-0 space-y-5">

              {/* ── General ── */}
              {activeTab === 'general' && (
                <form onSubmit={handleSaveGeneral} className="space-y-5">
                  <SectionCard>
                    <div className="flex items-center gap-2 mb-5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <h2 className="text-sm font-semibold text-white">Organization</h2>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <FieldLabel>Business name</FieldLabel>
                        <TextInput value={businessName} onChange={setBusinessName} placeholder="Your company name" />
                      </div>
                      <div>
                        <FieldLabel>Org slug</FieldLabel>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40">
                          <span className="text-xs text-slate-500">hephaestus.app/</span>
                          <span className="text-xs font-mono text-slate-300">{org?.slug ?? '—'}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">Slug cannot be changed.</p>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <div className="flex items-center gap-2 mb-5">
                      <Star className="w-4 h-4 text-amber-400/70" />
                      <h2 className="text-sm font-semibold text-white">Review link</h2>
                    </div>
                    <div>
                      <FieldLabel>Google review URL</FieldLabel>
                      <TextInput value={reviewUrl} onChange={setReviewUrl} placeholder="https://g.page/r/…/review" />
                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Used in the post-job review request SMS sent to customers automatically.
                      </p>
                    </div>
                    {reviewUrl && (
                      <a
                        href={reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="w-3 h-3" /> Test link
                      </a>
                    )}
                  </SectionCard>

                  <SectionCard>
                    <div className="flex items-center gap-2 mb-5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <h2 className="text-sm font-semibold text-white">SMS reminders</h2>
                    </div>
                    <div>
                      <FieldLabel>Reminder window</FieldLabel>
                      <div className="flex gap-2 mt-1.5">
                        {[24, 48, 72].map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setReminderHoursBefore(h)}
                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150"
                            style={reminderHoursBefore === h
                              ? { background: 'rgba(59,130,246,0.12)', borderColor: '#3b82f6', color: '#3b82f6' }
                              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: '#475569' }
                            }
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Customers receive an automated SMS this many hours before their appointment.
                      </p>
                    </div>
                  </SectionCard>

                  {generalError && (
                    <div className="px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/40 text-sm text-red-400">
                      {generalError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <SaveButton saving={generalSaving} saved={generalSaved} />
                  </div>
                </form>
              )}

              {/* ── Danger Zone (owner only, shown below General form) ── */}
              {activeTab === 'general' && role === 'owner' && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: '#1a1d26', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Permanently delete your organization and all associated data. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirmText(''); setDeleteError(null); setShowDeleteModal(true) }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-700/60 text-red-400 hover:bg-red-900/20 transition-all duration-150"
                  >
                    Delete Organization
                  </button>
                </div>
              )}

              {/* ── Services ── */}
              {activeTab === 'services' && (
                <div className="space-y-4">
                  <SectionCard>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <h2 className="text-sm font-semibold text-white">Service types</h2>
                        <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-0.5">{services.length}</span>
                      </div>
                      {!addingService && !editingService && (
                        <button
                          onClick={() => { setAddingService(true); setServiceError(null) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add service
                        </button>
                      )}
                    </div>

                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <Loader2 className="w-5 h-5 text-blue-500/60 animate-spin" />
                        <span className="text-sm text-slate-600">Loading…</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {serviceError && (
                          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/20 text-sm text-red-400">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {serviceError}
                          </div>
                        )}
                        {addingService && (
                          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/10">
                            <p className="text-xs font-semibold text-blue-300 mb-4">New service</p>
                            <ServiceForm
                              onSave={handleAddService}
                              onCancel={() => { setAddingService(false); setServiceError(null) }}
                              saving={serviceSaving}
                            />
                          </div>
                        )}

                        {services.map(svc => {
                          const colorHex = COLOR_OPTIONS.find(c => c.value === svc.color)?.hex ?? '#64748b'
                          return (
                            <div key={svc.id}>
                              {editingService?.id === svc.id ? (
                                <div className="p-4 rounded-xl border border-slate-600/40 bg-slate-800/30">
                                  <p className="text-xs font-semibold text-slate-300 mb-4">Editing: {svc.name}</p>
                                  <ServiceForm
                                    initial={svc}
                                    onSave={handleUpdateService}
                                    onCancel={() => { setEditingService(null); setServiceError(null) }}
                                    saving={serviceSaving}
                                  />
                                </div>
                              ) : (
                                <div
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-l-4 transition-all hover:border-white/10 group"
                                  style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeftColor: colorHex, background: 'rgba(255,255,255,0.02)' }}
                                >
                                  <span className="text-2xl w-8 text-center">{svc.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white/90">{svc.name}</p>
                                    <p className="text-[11px] text-slate-600">
                                      {svc.prep_templates?.length
                                        ? `${svc.prep_templates.length} default checklist item${svc.prep_templates.length > 1 ? 's' : ''}`
                                        : 'No default checklist'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => { setEditingService(svc); setAddingService(false) }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-300 hover:bg-blue-900/30 transition-all"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteService(svc.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {services.length === 0 && !addingService && (
                          <div className="text-center py-10">
                            <Layers className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-sm text-slate-600">No services yet.</p>
                            <p className="text-xs text-slate-700 mt-1">Add your first service type above.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* ── Plan ── */}
              {activeTab === 'plan' && org && (
                <PlanTab org={org} role={role} />
              )}

              {/* ── Booking Portal ── */}
              {activeTab === 'booking' && (
                <BookingPortalTab orgName={org?.businessName ?? ''} orgSlug={org?.slug ?? ''} />
              )}

            </main>
          </div>
        )}
      </div>

      {/* ── Delete Org Modal ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: '#1a1d26', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-900/30 border border-red-700/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Delete Organization?</h2>
                <p className="text-xs text-slate-500 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <ul className="text-xs text-slate-400 space-y-1.5 pl-1">
              {[
                'All jobs and appointment history',
                'All clients and technicians',
                'All services and SMS messages',
                'All team members and invitations',
                'Your active Stripe subscription',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <X className="w-3 h-3 text-red-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Type <span className="text-white font-bold">{org?.businessName ?? 'your organization name'}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={org?.businessName ?? ''}
                className="w-full bg-slate-800/80 border border-slate-600/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all"
                autoFocus
              />
            </div>

            {deleteError && (
              <div className="px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/40 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-slate-300 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrg}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== (org?.businessName ?? '').trim().toLowerCase()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
