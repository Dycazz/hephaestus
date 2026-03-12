'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Appointment } from '@/types'
import { timeSlots as allTimeSlots } from '@/lib/mockData'
import type { Technician } from '@/hooks/useTechnicians'

interface AddClientModalProps {
  onAdd: (appointment: Appointment) => void
  onClose: () => void
  technicians: Technician[]
  existingTimes: string[]
  defaultTime?: string
  defaultTechnicianId?: string
  defaultDate?: string  // ISO date string YYYY-MM-DD (defaults to today)
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  // Use local time (not UTC) so "Today" always matches the user's wall-clock date
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(iso: string): string {
  const todayDate = new Date()
  const todayISO = toISODate(todayDate)
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowISO = toISODate(tomorrowDate)
  if (iso === todayISO) return 'Today'
  if (iso === tomorrowISO) return 'Tomorrow'
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function buildScheduledAt(dateISO: string, timeStr: string): string {
  const [year, month, day] = dateISO.split('-').map(Number)
  const [timePart, meridiem] = timeStr.split(' ')
  const [hourStr, minuteStr] = timePart.split(':')
  let hour = parseInt(hourStr)
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return new Date(year, month - 1, day, hour, parseInt(minuteStr ?? '0'), 0).toISOString()
}

// ─── Fallback if API not yet available ────────────────────────────────────────

const fallbackServices: ServiceOption[] = [
  { name: 'Plumbing',   icon: '🔧', color: 'blue',   prepTemplates: ['Clear all items from under the sink', 'Turn off water supply valve under sink', 'Have towels nearby'] },
  { name: 'HVAC',       icon: '❄️', color: 'cyan',   prepTemplates: ['Clear 3-ft clearance around your outdoor AC unit', 'Locate your air filter', 'Clear access to attic if applicable'] },
  { name: 'Electrical', icon: '⚡', color: 'yellow', prepTemplates: ['Ensure breaker panel is fully accessible', 'Have a list of outlets or switches needing work'] },
  { name: 'Heating',    icon: '🔥', color: 'orange', prepTemplates: ['Locate your furnace or boiler', 'Clear 2-ft access around the heating unit', 'Note any error codes on your thermostat'] },
]

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
  const todayDate = new Date()
  const todayISO = toISODate(todayDate)
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowISO = toISODate(tomorrowDate)

  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [dateISO, setDateISO]   = useState<string>(defaultDate ?? todayISO)
  const [time, setTime]         = useState(defaultTime ?? '9:00 AM')
  const [address, setAddress]   = useState('')
  const [checklist, setChecklist] = useState<string[]>(fallbackServices[0].prepTemplates)
  const [newItem, setNewItem]   = useState('')
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const [services, setServices] = useState<ServiceOption[]>(fallbackServices)
  const [service, setService]   = useState<ServiceOption>(fallbackServices[0])
  const [servicesLoading, setServicesLoading] = useState(true)

  // Resolve the initially selected technician from props; fall back to first in list
  const initialTech = defaultTechnicianId
    ? (technicians.find(t => t.id === defaultTechnicianId) ?? technicians[0] ?? null)
    : (technicians[0] ?? null)
  const [technician, setTechnicianState] = useState<Technician | null>(initialTech)

  // Load services from the DB
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
      .catch(() => { /* keep fallback */ })
      .finally(() => setServicesLoading(false))
  }, [])

  const handleServiceChange = (name: string) => {
    const svc = services.find(s => s.name === name) ?? services[0]
    setService(svc)
    setChecklist(svc.prepTemplates)
  }

  const addChecklistItem = () => {
    if (newItem.trim()) {
      setChecklist(prev => [...prev, newItem.trim()])
      setNewItem('')
    }
  }

  const removeChecklistItem = (i: number) =>
    setChecklist(prev => prev.filter((_, idx) => idx !== i))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim())    errs.name    = 'Required'
    if (!phone.trim())   errs.phone   = 'Required'
    if (!address.trim()) errs.address = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const displayDate = formatDisplayDate(dateISO)
    const scheduledAt = buildScheduledAt(dateISO, time)
    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      service: service.name,
      serviceIcon: service.icon,
      serviceColor: service.color,
      scheduledTime: time,
      scheduledDate: displayDate,
      scheduledAt,
      technician: technician?.name ?? 'Unassigned',
      technicianId: technician?.id,
      address: address.trim(),
      status: 'scheduled',
      prepChecklist: checklist,
      smsThread: [],
      reviewRequestSent: false,
    }
    onAdd(newAppt)
  }

  // existingTimes are "DisplayDate-Time" e.g. "Today-9:00 AM" or "Mar 15-9:00 AM"
  const displayDate = formatDisplayDate(dateISO)
  const isBooked = (t: string) => existingTimes.includes(`${displayDate}-${t}`)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

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
              <select
                value={service.name}
                onChange={e => handleServiceChange(e.target.value)}
                disabled={servicesLoading}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {services.map(s => (
                  <option key={s.name} value={s.name}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Technician</label>
              {technicians.length === 0 ? (
                <p className="text-xs text-slate-400 pt-2">No technicians — add via Team</p>
              ) : (
                <select
                  value={technician?.id ?? ''}
                  onChange={e => {
                    const found = technicians.find(t => t.id === e.target.value) ?? null
                    setTechnicianState(found)
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Date</label>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick-select buttons */}
              <button
                onClick={() => setDateISO(todayISO)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  dateISO === todayISO
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateISO(tomorrowISO)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  dateISO === tomorrowISO
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                Tomorrow
              </button>
              {/* Custom date input */}
              <input
                type="date"
                value={dateISO}
                min={todayISO}
                onChange={e => e.target.value && setDateISO(e.target.value)}
                className={`border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  dateISO !== todayISO && dateISO !== tomorrowISO
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-300 text-slate-600'
                }`}
              />
            </div>
          </div>

          {/* Time slots */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Time</label>
            <div className="grid grid-cols-4 gap-1.5">
              {allTimeSlots.map(t => {
                const booked   = isBooked(t)
                const selected = time === t
                return (
                  <button
                    key={t}
                    onClick={() => !booked && setTime(t)}
                    disabled={booked}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      booked
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {t}
                    {booked && <span className="block text-[9px] text-slate-400">Booked</span>}
                  </button>
                )
              })}
            </div>
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
                placeholder="Add a custom prep item..."
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
              Add to Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
