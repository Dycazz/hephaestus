'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Loader2, Plus, Trash2, ChevronRight, ChevronLeft, Check,
  LayoutGrid, MessageSquare, Globe, BarChart3,
} from 'lucide-react'
import { useOrg } from '@/context/OrgContext'

// ── Constants (mirrored from settings/page.tsx) ────────────────────────────

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

const ICON_OPTIONS = [
  '🔧', '🔩', '🪛', '❄️', '⚡', '🔥', '💧', '🚿', '🪠',
  '🏗️', '🪟', '🔌', '🪜', '🧰', '🌡️', '🔋', '🏠', '🧹',
  '🌿', '🛁', '🔑', '⚙️', '🛠️', '📦', '🌬️',
]

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface TechAvailDay { day: number; startTime: string; endTime: string }

interface TechEntry {
  name: string
  color: string
  commissionPercent: string
  availDays: TechAvailDay[]
}

interface ServiceEntry { name: string; icon: string; priceDollars: string }
interface PortalDay { day: number; startTime: string; endTime: string }

type Step = 0 | 1 | 2 | 3 | 4

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTech(): TechEntry {
  return {
    name: '',
    color: 'blue',
    commissionPercent: '',
    availDays: [1, 2, 3, 4, 5].map(d => ({ day: d, startTime: '08:00', endTime: '17:00' })),
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { org, loading: orgLoading } = useOrg()

  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Step 1 — Technicians
  const [techs, setTechs] = useState<TechEntry[]>([makeTech()])

  // Step 2 — Services
  const [services, setServices] = useState<ServiceEntry[]>([{ name: '', icon: '🔧', priceDollars: '' }])
  const [openIconPicker, setOpenIconPicker] = useState<number | null>(null)

  // Step 3 — Booking portal
  const [portalBusinessName, setPortalBusinessName] = useState('')
  const [portalPhone, setPortalPhone] = useState('')
  const [portalAccentColor, setPortalAccentColor] = useState('orange')
  const [portalDays, setPortalDays] = useState<PortalDay[]>(
    [1, 2, 3, 4, 5].map(d => ({ day: d, startTime: '09:00', endTime: '17:00' }))
  )

  useEffect(() => {
    if (org?.businessName) setPortalBusinessName(org.businessName)
  }, [org?.businessName])

  // ── Technician helpers ─────────────────────────────────────────────────

  function updateTech<K extends keyof TechEntry>(i: number, field: K, value: TechEntry[K]) {
    setTechs(p => p.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function techIsDaySelected(techIdx: number, day: number) {
    return techs[techIdx].availDays.some(s => s.day === day)
  }

  function toggleTechDay(techIdx: number, day: number) {
    setTechs(prev => prev.map((t, i) => {
      if (i !== techIdx) return t
      const has = t.availDays.some(s => s.day === day)
      return {
        ...t,
        availDays: has
          ? t.availDays.filter(s => s.day !== day)
          : [...t.availDays, { day, startTime: '08:00', endTime: '17:00' }],
      }
    }))
  }

  function updateTechDayTime(techIdx: number, day: number, field: 'startTime' | 'endTime', value: string) {
    setTechs(prev => prev.map((t, i) => {
      if (i !== techIdx) return t
      return { ...t, availDays: t.availDays.map(s => s.day === day ? { ...s, [field]: value } : s) }
    }))
  }

  // ── Portal helpers ─────────────────────────────────────────────────────

  function portalIsDaySelected(day: number) {
    return portalDays.some(s => s.day === day)
  }

  function togglePortalDay(day: number) {
    if (portalIsDaySelected(day)) {
      setPortalDays(prev => prev.filter(s => s.day !== day))
    } else {
      setPortalDays(prev => [...prev, { day, startTime: '09:00', endTime: '17:00' }])
    }
  }

  function updatePortalDayTime(day: number, field: 'startTime' | 'endTime', value: string) {
    setPortalDays(prev => prev.map(s => s.day === day ? { ...s, [field]: value } : s))
  }

  // ── Submit handlers ────────────────────────────────────────────────────

  async function submitTechs(): Promise<boolean> {
    const valid = techs.filter(t => t.name.trim())
    if (valid.length === 0) return true

    for (const tech of valid) {
      // 1. Create technician
      const createRes = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tech.name.trim(), color: tech.color }),
      })
      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save a technician. You can add them later in Settings.')
        return false
      }
      const { technician } = await createRes.json()

      // 2. Set commission if provided
      const commission = parseFloat(tech.commissionPercent)
      if (!isNaN(commission) && commission > 0) {
        await fetch(`/api/technicians/${technician.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commission_percent: commission }),
        })
      }

      // 3. Set availability — send all 7 days
      const availBody = [0, 1, 2, 3, 4, 5, 6].map(day => {
        const slot = tech.availDays.find(s => s.day === day)
        return {
          dayOfWeek: day,
          startTime: slot?.startTime ?? '08:00',
          endTime: slot?.endTime ?? '17:00',
          isWorking: !!slot,
        }
      })
      await fetch(`/api/technicians/${technician.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availBody),
      })
    }
    return true
  }

  async function submitServices(): Promise<boolean> {
    const valid = services.filter(s => s.name.trim())
    if (valid.length === 0) return true

    for (const svc of valid) {
      const priceCents = Math.round((parseFloat(svc.priceDollars) || 0) * 100)
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: svc.name.trim(), icon: svc.icon, color: 'blue', priceCents }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save a service. You can add them later in Settings.')
        return false
      }
    }
    return true
  }

  async function submitPortal(): Promise<boolean> {
    if (!portalBusinessName.trim()) {
      setError('Please enter a business name for your booking portal.')
      return false
    }

    const portalRes = await fetch('/api/booking-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: portalBusinessName.trim(),
        business_phone: portalPhone.trim() || null,
        accent_color: portalAccentColor,
        booking_window_days: 30,
        slot_duration_minutes: 60,
      }),
    })

    if (!portalRes.ok) {
      const d = await portalRes.json().catch(() => ({}))
      if (!d.error?.includes('already exists')) {
        setError(d.error ?? 'Failed to create booking portal. You can set it up later in Settings.')
        return false
      }
    }

    if (portalDays.length > 0) {
      const availRes = await fetch('/api/booking-portal/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: portalDays.map(s => ({
            day_of_week: s.day,
            start_time: s.startTime,
            end_time: s.endTime,
          })),
        }),
      })
      if (!availRes.ok) {
        setError('Failed to save availability. You can update it later in Settings.')
        return false
      }
    }

    return true
  }

  async function completeOnboarding() {
    await fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboardingCompleted: true }),
    })
    router.push('/dashboard')
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  async function handleContinue() {
    setError(null)
    setSaving(true)
    try {
      if (step === 1) {
        const ok = await submitTechs()
        if (!ok) return
        setCompletedSteps(prev => new Set(prev).add(1))
      } else if (step === 2) {
        const ok = await submitServices()
        if (!ok) return
        setCompletedSteps(prev => new Set(prev).add(2))
      } else if (step === 3) {
        const ok = await submitPortal()
        if (!ok) return
        setCompletedSteps(prev => new Set(prev).add(3))
      }
      setStep(s => (s + 1) as Step)
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    setError(null)
    setStep(s => (s + 1) as Step)
  }

  function handleBack() {
    setError(null)
    setStep(s => (s - 1) as Step)
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="hephaestus.work" width={28} height={28} className="rounded" />
          <span className="text-sm font-semibold text-white/70" style={{ fontFamily: 'Syne, sans-serif' }}>
            hephaestus.work
          </span>
        </div>
        {step > 0 && step < 4 && (
          <span className="text-sm text-white/40">Step {step} of 3</span>
        )}
      </div>

      {/* Progress dots */}
      {step > 0 && step < 4 && (
        <div className="flex justify-center gap-2 pt-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < step ? 'bg-amber-500' : i === step ? 'bg-amber-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 0 && <StepWelcome onStart={() => setStep(1)} />}
          {step === 1 && (
            <StepTechnicians
              techs={techs}
              setTechs={setTechs}
              makeTech={makeTech}
              techIsDaySelected={techIsDaySelected}
              toggleTechDay={toggleTechDay}
              updateTechDayTime={updateTechDayTime}
              updateTech={updateTech}
              saving={saving}
              onContinue={handleContinue}
              onSkip={handleSkip}
              onBack={handleBack}
            />
          )}
          {step === 2 && (
            <StepServices
              services={services}
              setServices={setServices}
              openIconPicker={openIconPicker}
              setOpenIconPicker={setOpenIconPicker}
              saving={saving}
              onContinue={handleContinue}
              onSkip={handleSkip}
              onBack={handleBack}
            />
          )}
          {step === 3 && (
            <StepBookingPortal
              businessName={portalBusinessName}
              setBusinessName={setPortalBusinessName}
              phone={portalPhone}
              setPhone={setPortalPhone}
              accentColor={portalAccentColor}
              setAccentColor={setPortalAccentColor}
              days={portalDays}
              isDaySelected={portalIsDaySelected}
              toggleDay={togglePortalDay}
              updateDayTime={updatePortalDayTime}
              saving={saving}
              onContinue={handleContinue}
              onSkip={handleSkip}
              onBack={handleBack}
            />
          )}
          {step === 4 && (
            <StepDone
              completedSteps={completedSteps}
              orgSlug={org?.slug ?? ''}
              onFinish={completeOnboarding}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 0: Welcome ────────────────────────────────────────────────────────

function StepWelcome({ onStart }: { onStart: () => void }) {
  const features = [
    {
      icon: <LayoutGrid className="w-5 h-5" />,
      title: 'Dispatch Board',
      desc: 'Manage all your jobs from a single kanban board',
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'SMS Reminders',
      desc: 'Automated appointment reminders and confirmations',
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: 'Online Booking',
      desc: 'Let customers book directly from your branded link',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Analytics',
      desc: 'Track revenue, technician commissions, and expenses',
    },
  ]

  return (
    <div className="text-center">
      <div className="mb-2 text-amber-500 text-sm font-medium tracking-wide uppercase">
        Welcome to hephaestus.work
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
        Let&apos;s get you set up
      </h1>
      <p className="text-white/50 mb-10 text-base">
        It only takes a few minutes. We&apos;ll walk you through adding your team, your services,
        and setting up your online booking page.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {features.map(f => (
          <div key={f.title} className="text-left p-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="text-amber-500 mb-2">{f.icon}</div>
            <div className="font-medium text-sm mb-1">{f.title}</div>
            <div className="text-white/40 text-xs leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        Get Started <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Step 1: Technicians ────────────────────────────────────────────────────

function StepTechnicians({
  techs, setTechs, makeTech, techIsDaySelected, toggleTechDay, updateTechDayTime, updateTech,
  saving, onContinue, onSkip, onBack,
}: {
  techs: TechEntry[]
  setTechs: React.Dispatch<React.SetStateAction<TechEntry[]>>
  makeTech: () => TechEntry
  techIsDaySelected: (techIdx: number, day: number) => boolean
  toggleTechDay: (techIdx: number, day: number) => void
  updateTechDayTime: (techIdx: number, day: number, field: 'startTime' | 'endTime', value: string) => void
  updateTech: <K extends keyof TechEntry>(i: number, field: K, value: TechEntry[K]) => void
  saving: boolean
  onContinue: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <div>
      <StepHeader
        step={1}
        title="Add your technicians"
        subtitle="Set up your team with their hours and commission rate."
      />

      <div className="space-y-4 mb-6">
        {techs.map((tech, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-4">
            {/* Name + color + remove */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={tech.name}
                onChange={e => updateTech(i, 'name', e.target.value)}
                placeholder="Technician name"
                className="flex-1 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
              />
              {techs.length > 1 && (
                <button
                  onClick={() => setTechs(p => p.filter((_, idx) => idx !== i))}
                  className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Color + commission row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40 mr-1">Color</span>
                {COLOR_OPTIONS.slice(0, 7).map(c => (
                  <button
                    key={c.value}
                    onClick={() => updateTech(i, 'color', c.value)}
                    title={c.name}
                    className={`w-5 h-5 rounded-full transition-transform flex-shrink-0 ${
                      tech.color === c.value ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <label className="text-xs text-white/40">Commission</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tech.commissionPercent}
                    onChange={e => updateTech(i, 'commissionPercent', e.target.value)}
                    placeholder="0"
                    className="w-14 px-2 py-1 bg-white/[0.06] border border-white/10 rounded text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-right"
                  />
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div>
              <div className="text-xs text-white/40 mb-2">Working hours</div>
              <div className="space-y-2">
                {DAYS.map(({ label, value }) => {
                  const selected = techIsDaySelected(i, value)
                  const slot = tech.availDays.find(s => s.day === value)
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTechDay(i, value)}
                        className={`w-10 text-xs font-medium py-1 rounded border transition-colors flex-shrink-0 ${
                          selected
                            ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                            : 'bg-white/[0.04] border-white/10 text-white/30'
                        }`}
                      >
                        {label}
                      </button>
                      {selected && slot && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={e => updateTechDayTime(i, value, 'startTime', e.target.value)}
                            className="px-2 py-1 bg-white/[0.06] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-amber-500/50"
                          />
                          <span className="text-white/30">–</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={e => updateTechDayTime(i, value, 'endTime', e.target.value)}
                            className="px-2 py-1 bg-white/[0.06] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-amber-500/50"
                          />
                        </div>
                      )}
                      {!selected && (
                        <span className="text-xs text-white/20">Off</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setTechs(p => [...p, makeTech()])}
        className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors mb-8"
      >
        <Plus className="w-4 h-4" /> Add another technician
      </button>

      <StepNav saving={saving} onContinue={onContinue} onSkip={onSkip} onBack={onBack} />
    </div>
  )
}

// ── Step 2: Services ───────────────────────────────────────────────────────

function StepServices({
  services, setServices, openIconPicker, setOpenIconPicker,
  saving, onContinue, onSkip, onBack,
}: {
  services: ServiceEntry[]
  setServices: React.Dispatch<React.SetStateAction<ServiceEntry[]>>
  openIconPicker: number | null
  setOpenIconPicker: React.Dispatch<React.SetStateAction<number | null>>
  saving: boolean
  onContinue: () => void
  onSkip: () => void
  onBack: () => void
}) {
  function updateField(i: number, field: keyof ServiceEntry, v: string) {
    setServices(p => p.map((s, idx) => idx === i ? { ...s, [field]: v } : s))
  }

  return (
    <div>
      <StepHeader
        step={2}
        title="Add your services"
        subtitle="What do you offer? Set a name, icon, and price."
      />

      <div className="space-y-3 mb-6">
        {services.map((svc, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setOpenIconPicker(openIconPicker === i ? null : i)}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-xl transition-colors"
                >
                  {svc.icon}
                </button>
                {openIconPicker === i && (
                  <div className="absolute z-10 top-12 left-0 bg-[#1a1d24] border border-white/10 rounded-xl p-3 grid grid-cols-5 gap-1 shadow-2xl">
                    {ICON_OPTIONS.map(ico => (
                      <button
                        key={ico}
                        onClick={() => { updateField(i, 'icon', ico); setOpenIconPicker(null) }}
                        className="w-8 h-8 text-lg hover:bg-white/10 rounded flex items-center justify-center transition-colors"
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={svc.name}
                onChange={e => updateField(i, 'name', e.target.value)}
                placeholder="Service name"
                className="flex-1 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
              />
              {services.length > 1 && (
                <button
                  onClick={() => setServices(p => p.filter((_, idx) => idx !== i))}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={svc.priceDollars}
                onChange={e => updateField(i, 'priceDollars', e.target.value)}
                placeholder="Price (optional)"
                className="w-36 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setServices(p => [...p, { name: '', icon: '🔧', priceDollars: '' }])}
        className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors mb-8"
      >
        <Plus className="w-4 h-4" /> Add another service
      </button>

      <StepNav saving={saving} onContinue={onContinue} onSkip={onSkip} onBack={onBack} />
    </div>
  )
}

// ── Step 3: Booking Portal ─────────────────────────────────────────────────

function StepBookingPortal({
  businessName, setBusinessName, phone, setPhone,
  accentColor, setAccentColor, days, isDaySelected, toggleDay, updateDayTime,
  saving, onContinue, onSkip, onBack,
}: {
  businessName: string
  setBusinessName: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  accentColor: string
  setAccentColor: (v: string) => void
  days: PortalDay[]
  isDaySelected: (d: number) => boolean
  toggleDay: (d: number) => void
  updateDayTime: (d: number, field: 'startTime' | 'endTime', v: string) => void
  saving: boolean
  onContinue: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <div>
      <StepHeader
        step={3}
        title="Set up your booking portal"
        subtitle="Give customers a link to book appointments with you directly."
      />

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Business name</label>
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="Your business name"
            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5">Business phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Portal accent color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setAccentColor(c.value)}
                title={c.name}
                className={`w-7 h-7 rounded-full transition-transform ${
                  accentColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1115] scale-110' : ''
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-2">Availability</label>
          <div className="space-y-2">
            {DAYS.map(({ label, value }) => {
              const selected = isDaySelected(value)
              const slot = days.find(s => s.day === value)
              return (
                <div key={value} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDay(value)}
                    className={`w-12 text-xs font-medium py-1.5 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                        : 'bg-white/[0.04] border-white/10 text-white/30'
                    }`}
                  >
                    {label}
                  </button>
                  {selected && slot && (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={e => updateDayTime(value, 'startTime', e.target.value)}
                        className="px-2 py-1 bg-white/[0.06] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-amber-500/50"
                      />
                      <span className="text-white/30 text-xs">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={e => updateDayTime(value, 'endTime', e.target.value)}
                        className="px-2 py-1 bg-white/[0.06] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <StepNav saving={saving} onContinue={onContinue} onSkip={onSkip} onBack={onBack} />
    </div>
  )
}

// ── Step 4: Done ───────────────────────────────────────────────────────────

function StepDone({
  completedSteps, orgSlug, onFinish,
}: {
  completedSteps: Set<number>
  orgSlug: string
  onFinish: () => void
}) {
  const [finishing, setFinishing] = useState(false)

  const items = [
    { step: 1, label: 'Technicians added' },
    { step: 2, label: 'Services created' },
    { step: 3, label: 'Booking portal set up' },
  ]

  async function handleFinish() {
    setFinishing(true)
    await onFinish()
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
        <Check className="w-7 h-7 text-amber-500" />
      </div>

      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        You&apos;re all set!
      </h1>
      <p className="text-white/50 mb-8 text-sm">
        Your hephaestus.work account is ready. Here&apos;s a summary of what was configured:
      </p>

      <div className="text-left space-y-2 mb-8">
        {items.map(({ step, label }) => {
          const done = completedSteps.has(step)
          return (
            <div
              key={step}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                done ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/30'
              }`}>
                {done ? <Check className="w-3 h-3" /> : <span className="text-xs">—</span>}
              </div>
              <span className={`text-sm ${done ? 'text-white' : 'text-white/40'}`}>{label}</span>
              {!done && <span className="text-xs text-white/25 ml-auto">skipped</span>}
            </div>
          )
        })}
      </div>

      {completedSteps.has(3) && orgSlug && (
        <div className="mb-8 p-4 rounded-xl bg-white/[0.04] border border-white/10 text-left">
          <div className="text-xs text-white/40 mb-1">Your booking link</div>
          <div className="text-sm text-amber-400 font-mono break-all">
            hephaestus.work/book/{orgSlug}
          </div>
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={finishing}
        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {finishing && <Loader2 className="w-4 h-4 animate-spin" />}
        Go to Dashboard <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="text-xs text-amber-500/70 font-medium tracking-wide uppercase mb-1">
        Step {step} of 3
      </div>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h2>
      <p className="text-white/40 text-sm">{subtitle}</p>
    </div>
  )
}

function StepNav({
  saving, onContinue, onSkip, onBack,
}: {
  saving: boolean
  onContinue: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-3">
        <button
          onClick={onSkip}
          disabled={saving}
          className="text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          Skip
        </button>
        <button
          onClick={onContinue}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
