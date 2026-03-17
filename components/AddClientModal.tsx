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
}

export function AddClientModal({
  onAdd,
  onClose,
  technicians,
  existingTimes,
  defaultTime,
  defaultTechnicianId,
  defaultDate,
}: AddClientModalProps) {
  const todayISO = toISODate(new Date())

  // ── Core fields ─────────────────────────────────────────────────────────────
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [dateISO, setDateISO] = useState<string>(defaultDate ?? todayISO)
  const [time, setTime]       = useState<string | null>(defaultTime ?? null)
  const [address, setAddress] = useState('')
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
    fetch('/api/services')
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
        }))
        setServices(loaded)
        setService(loaded[0])
        setChecklist(loaded[0].prepTemplates)
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
    }
    onAdd(newAppt)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5 rounded-t-2xl shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">New Appointment</p>
              <p className="text-sm text-blue-100">Add a client to the schedule</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-5 space-y-4">

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Customer Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone *</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
            </div>
          </div>

          {/* Service + Technician */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Service</label>
              {!servicesLoading && services.length === 0 ? (
                <p className="text-xs text-slate-400 pt-2">No services — add via Settings</p>
              ) : (
                <select
                  value={service?.name ?? ''}
                  onChange={e => handleServiceChange(e.target.value)}
                  disabled={servicesLoading}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {services.map(s => (
                    <option key={s.name} value={s.name}>{s.icon} {s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Technician</label>
              {technicians.length === 0 ? (
                <p className="text-xs text-slate-400 pt-2">No technicians — add via Team</p>
              ) : (
                <select
                  value={technician?.id ?? ''}
                  onChange={e => setTechnicianState(technicians.find(t => t.id === e.target.value) ?? null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Date & Time</label>
            {errors.time && <p className="text-xs text-red-500 mb-1.5">{errors.time}</p>}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
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
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Duration</label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDurationMinutes(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    durationMinutes === d.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
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
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Repeat?
              {showRecurrence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showRecurrence && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {RECURRENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRecurrenceRule(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        recurrenceRule === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {recurrenceRule !== 'none' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                      Repeat until <span className="font-normal text-slate-400">(leave blank for 1 year)</span>
                    </label>
                    <div className="border border-slate-200 rounded-xl p-3 bg-white">
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
                      <p className="mt-2 text-xs text-blue-600 font-semibold">
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
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Address *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St"
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errors.address && <p className="text-xs text-red-500 mt-0.5">{errors.address}</p>}
          </div>

          {/* Prep Checklist */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">📋 Prep Checklist</label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-amber-800 flex-1">{item}</span>
                  <button onClick={() => removeChecklistItem(i)} className="text-amber-400 hover:text-red-500 transition-colors">
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
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addChecklistItem}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auto-reminder toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              {autoReminder
                ? <Bell className="w-4 h-4 text-blue-500" />
                : <BellOff className="w-4 h-4 text-slate-400" />
              }
              <div>
                <p className="text-xs font-semibold text-slate-700">Auto-reminders</p>
                <p className="text-[11px] text-slate-400">
                  {autoReminder ? 'SMS reminders enabled for this appointment' : 'No automatic reminders will be sent'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoReminder(v => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                autoReminder ? 'bg-blue-600' : 'bg-slate-300'
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
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-grow py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
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
