'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, Bell, BellOff } from 'lucide-react'
import { Appointment, RecurrenceRule, TechnicianAvailability } from '@/types'
import { DateTimePicker } from '@/components/DateTimePicker'
import { formatDisplayDate, buildScheduledAt, toISODate, addDays } from '@/lib/dateUtils'
import type { Technician } from '@/hooks/useTechnicians'

interface AddClientModalProps {
  onAdd: (appointment: Appointment) => void
  onClose: () => void
  technicians: Technician[]
  existingTimes: string[]      // "DisplayDate-Time" strings, e.g. "Today-9:00 AM"
  defaultTime?: string
  defaultTechnicianId?: string
  defaultDate?: string         // ISO date "YYYY-MM-DD" (defaults to today)
  defaultName?: string
  defaultPhone?: string
  defaultAddress?: string
}

// ─── Duration options ─────────────────────────────────────────────────────────
const DURATIONS = [
  { label: '15m',  value: 15 },
  { label: '30m',  value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1.5h', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
  { label: '4 hr', value: 240 },
]

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceRule }[] = [
  { label: 'None',      value: 'none' },
  { label: 'Daily',     value: 'daily' },
  { label: 'Weekly',    value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly',   value: 'monthly' },
]

// ─── Service ──────────────────────────────────────────────────────────────────
interface ServiceOption {
  name: string
  icon: string
  color: string
  prepTemplates: string[]
  price_cents: number
}

export function AddClientModal({
  onAdd,
  onClose,
  technicians,
  existingTimes,
  defaultTime,
  defaultTechnicianId,
  defaultDate,
  defaultName,
  defaultPhone,
  defaultAddress,
}: AddClientModalProps) {
  const todayISO = toISODate(new Date())

  // ── Core fields ─────────────────────────────────────────────────────────────
  const [name, setName]       = useState(defaultName ?? '')
  const [phone, setPhone]     = useState(defaultPhone ?? '')
  const [dateISO, setDateISO] = useState<string>(defaultDate ?? todayISO)
  const [time, setTime]       = useState<string | null>(defaultTime ?? null)
  const [address, setAddress] = useState(defaultAddress ?? '')
  const [errors, setErrors]   = useState<Record<string, string>>({})

  // ── Service ─────────────────────────────────────────────────────────────────
  const [services, setServices]           = useState<ServiceOption[]>([])
  const [service, setService]             = useState<ServiceOption | null>(null)
  const [servicesLoading, setServicesLoading] = useState(true)

  // ── Prep checklist ──────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState<string[]>([])
  const [newItem, setNewItem]     = useState('')

  // ── Reminders ───────────────────────────────────────────────────────────────
  const [autoReminder, setAutoReminder] = useState(true)

  // ── Job price ────────────────────────────────────────────────────────────────
  const [priceCents, setPriceCents] = useState<number | null>(null)

  // ── Scheduling v2 ───────────────────────────────────────────────────────────
  const [durationMinutes, setDurationMinutes]     = useState(60)
  const [recurrenceRule, setRecurrenceRule]       = useState<RecurrenceRule>('none')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null)
  const [showRecurrence, setShowRecurrence]       = useState(false)
  const [techAvailability, setTechAvailability]   = useState<TechnicianAvailability[] | null>(null)

  // ── Technician ──────────────────────────────────────────────────────────────
  const initialTech = defaultTechnicianId
    ? (technicians.find(t => t.id === defaultTechnicianId) ?? technicians[0] ?? null)
    : (technicians[0] ?? null)
  const [technician, setTechnicianState] = useState<Technician | null>(initialTech)

  // Load services from DB
  useEffect(() => {
    fetch('/api/services', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.services?.length) return
        const loaded: ServiceOption[] = json.services.map((s: Record<string, unknown>) => ({
          name: s.name as string,
          icon: (s.icon ?? '') as string,
          color: (s.color ?? 'blue') as string,
          prepTemplates: Array.isArray(s.prep_templates)
            ? s.prep_templates as string[]
            : JSON.parse((s.prep_templates as string | null) ?? '[]'),
          price_cents: typeof s.price_cents === 'number' ? s.price_cents : 0,
        }))
        setServices(loaded)
        setService(loaded[0])
        setChecklist(loaded[0].prepTemplates)
        setPriceCents(null)
      })
      .catch(() => {})
      .finally(() => setServicesLoading(false))
  }, [])

  // Fetch technician availability when technician changes
  useEffect(() => {
    if (!technician?.id) { setTechAvailability(null); return }
    fetch(`/api/technicians/${technician.id}/availability`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.availability) setTechAvailability(json.availability) })
      .catch(() => setTechAvailability(null))
  }, [technician?.id])

  // Booked times for the currently selected date (to pass to DateTimePicker)
  const bookedTimesForDate = useMemo(() => {
    const displayDate = formatDisplayDate(dateISO)
    const prefix = `${displayDate}-`
    return existingTimes
      .filter(s => s.startsWith(prefix))
      .map(s => s.slice(prefix.length))
  }, [existingTimes, dateISO])

  // Preview count for recurring appointments
  const recurringCount = useMemo(() => {
    if (recurrenceRule === 'none') return 0
    const endISO = recurrenceEndDate
      ?? toISODate(addDays(new Date(dateISO + 'T12:00:00'), 365))
    const intervalDays: Record<Exclude<RecurrenceRule, 'none'>, number> = {
      daily: 1, weekly: 7, biweekly: 14, monthly: 30,
    }
    const interval = intervalDays[recurrenceRule as Exclude<RecurrenceRule, 'none'>] ?? 7
    let count = 1
    let cur = new Date(dateISO + 'T12:00:00')
    while (count < 60) {
      cur = addDays(cur, interval)
      if (toISODate(cur) > endISO) break
      count++
    }
    return count
  }, [recurrenceRule, dateISO, recurrenceEndDate])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleServiceChange = (svcName: string) => {
    const svc = services.find(s => s.name === svcName) ?? services[0] ?? null
    setService(svc)
    setChecklist(svc?.prepTemplates ?? [])
    setPriceCents(null)
  }

  const addChecklistItem = () => {
    if (newItem.trim()) { setChecklist(prev => [...prev, newItem.trim()]); setNewItem('') }
  }
  const removeChecklistItem = (i: number) =>
    setChecklist(prev => prev.filter((_, idx) => idx !== i))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim())    errs.name    = 'Required'
    if (!phone.trim())   errs.phone   = 'Required'
    if (!address.trim()) errs.address = 'Required'
    if (!time)           errs.time    = 'Select a time slot'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate() || !time || !service) return
    const scheduledAt = buildScheduledAt(dateISO, time)
    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      service: service.name,
      serviceIcon: service.icon,
      serviceColor: service.color,
      scheduledTime: time,
      scheduledDate: formatDisplayDate(dateISO),
      scheduledAt,
      technician: technician?.name ?? 'Unassigned',
      technicianId: technician?.id,
      address: address.trim(),
      status: 'scheduled',
      prepChecklist: checklist,
      smsThread: [],
      reviewRequestSent: false,
      durationMinutes,
      recurrenceRule,
      recurrenceEndDate: recurrenceRule !== 'none' ? (recurrenceEndDate ?? undefined) : undefined,
      autoReminder,
      priceCents: priceCents ?? service.price_cents,
    }
    onAdd(newAppt)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-morphism rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
 
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 backdrop-blur-md p-5 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-text-primary">New Appointment</p>
              <p className="text-sm text-text-secondary/70">Add a client to the schedule</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
 
        {/* Scrollable body */}
        <div className="overflow-y-auto p-5 space-y-4">
 
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1 block">Customer Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50 ${errors.name ? 'border-red-400/50' : 'border-white/10'}`}
              />
              {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1 block">Phone *</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50 ${errors.phone ? 'border-red-400/50' : 'border-white/10'}`}
              />
              {errors.phone && <p className="text-xs text-red-400 mt-0.5">{errors.phone}</p>}
            </div>
          </div>
 
          {/* Service + Technician */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1 block">Service</label>
              {!servicesLoading && services.length === 0 ? (
                <p className="text-xs text-text-muted pt-2">No services — add via Settings</p>
              ) : (
                <select
                  value={service?.name ?? ''}
                  onChange={e => handleServiceChange(e.target.value)}
                  disabled={servicesLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60"
                >
                  {services.map(s => (
                    <option key={s.name} value={s.name} className="bg-surface">{s.icon} {s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1 block">Technician</label>
              {technicians.length === 0 ? (
                <p className="text-xs text-text-muted pt-2">No technicians — add via Team</p>
              ) : (
                <select
                  value={technician?.id ?? ''}
                  onChange={e => setTechnicianState(technicians.find(t => t.id === e.target.value) ?? null)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id} className="bg-surface">{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
 
          {/* Job Price */}
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">
              Job Price <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={priceCents !== null ? (priceCents / 100).toString() : ''}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9.]/g, '')
                  setPriceCents(val !== '' ? Math.round(parseFloat(val) * 100) : null)
                }}
                placeholder={service?.price_cents ? (service.price_cents / 100).toFixed(2) : 'e.g. 150.00'}
                className="w-44 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">Leave blank to use the service&apos;s default price</p>
          </div>
 
          {/* Date & Time */}
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-2 block">Date & Time</label>
            {errors.time && <p className="text-xs text-red-400 mb-1.5">{errors.time}</p>}
            <div className="border border-white/5 rounded-xl p-3 bg-white/5 backdrop-blur-sm">
              <DateTimePicker
                date={dateISO}
                time={time}
                onDateChange={d => { setDateISO(d); setTime(null) }}
                onTimeChange={t => { setTime(t); setErrors(e => ({ ...e, time: '' })) }}
                bookedTimes={bookedTimesForDate}
                technicianAvailability={techAvailability ?? undefined}
              />
            </div>
          </div>
 
          {/* Duration */}
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-2 block">Duration</label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDurationMinutes(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    durationMinutes === d.value
                      ? 'bg-accent/80 text-black border-accent'
                      : 'bg-white/5 text-text-secondary border-white/10 hover:border-accent/40'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
 
          {/* Recurrence */}
          <div>
            <button
              onClick={() => setShowRecurrence(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-secondary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Repeat?
              {showRecurrence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
 
            {showRecurrence && (
              <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRecurrenceRule(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                        recurrenceRule === opt.value
                          ? 'bg-accent/80 text-black border-accent'
                          : 'bg-white/5 text-text-secondary border-white/10 hover:border-accent/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
 
                {recurrenceRule !== 'none' && (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                      Repeat until <span className="font-normal text-text-muted">(leave blank for 1 year)</span>
                    </label>
                    <div className="border border-white/5 rounded-xl p-3 bg-white/5">
                      <DateTimePicker
                        date={recurrenceEndDate}
                        time={null}
                        onDateChange={setRecurrenceEndDate}
                        onTimeChange={() => {}}
                        minDate={dateISO}
                        dateOnly
                      />
                    </div>
                    {recurringCount > 1 && (
                      <p className="mt-2 text-xs text-accent font-semibold">
                        Creates {recurringCount} appointments total
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
 
          {/* Address */}
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">Address *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St"
              className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50 ${errors.address ? 'border-red-400/50' : 'border-white/10'}`}
            />
            {errors.address && <p className="text-xs text-red-400 mt-0.5">{errors.address}</p>}
          </div>
 
          {/* Prep Checklist */}
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-2 block">📋 Prep Checklist</label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-accent/5 border border-accent/10 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-text-primary/90 flex-1">{item}</span>
                  <button onClick={() => removeChecklistItem(i)} className="text-accent/40 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add a custom prep item…"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                onClick={addChecklistItem}
                className="px-3 py-2 bg-accent/80 hover:bg-accent text-black rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
 
          {/* Auto-reminder toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
            <div className="flex items-center gap-2.5">
              {autoReminder
                ? <Bell className="w-4 h-4 text-accent" />
                : <BellOff className="w-4 h-4 text-text-muted" />
              }
              <div>
                <p className="text-xs font-semibold text-text-secondary">Auto-reminders</p>
                <p className="text-[11px] text-text-muted">
                  {autoReminder ? 'SMS reminders enabled for this appointment' : 'No automatic reminders will be sent'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoReminder(v => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                autoReminder ? 'bg-accent' : 'bg-white/10'
              }`}
              role="switch"
              aria-checked={autoReminder}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  autoReminder ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
 
          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-white/10 text-text-secondary text-sm font-medium rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-grow py-2.5 bg-accent hover:bg-accent/90 text-black text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5"
            >
              {recurrenceRule !== 'none' && recurringCount > 1
                ? `Add ${recurringCount} Appointments`
                : 'Add to Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
