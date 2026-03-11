'use client'

import { useState } from 'react'
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
  defaultDate?: 'Today' | 'Tomorrow'
}

const serviceConfig: Record<string, { icon: string; color: string }> = {
  Plumbing:   { icon: '🔧', color: 'blue' },
  HVAC:       { icon: '❄️', color: 'cyan' },
  Electrical: { icon: '⚡', color: 'yellow' },
  Heating:    { icon: '🔥', color: 'orange' },
}

const prepPresets: Record<string, string[]> = {
  Plumbing: [
    'Clear all items from under the sink',
    'Turn off water supply valve under sink',
    'Have towels nearby — minor water spillage may occur',
  ],
  HVAC: [
    'Clear 3-ft clearance around your outdoor AC unit',
    'Locate your air filter — we will inspect and replace if needed',
    'Clear access to attic if applicable',
  ],
  Electrical: [
    'Ensure breaker panel is fully accessible',
    'Have a list of outlets or switches needing work',
  ],
  Heating: [
    'Locate your furnace or boiler',
    'Clear 2-ft access around the heating unit',
    'Note any error codes on your thermostat',
  ],
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
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [service, setService] = useState('Plumbing')
  const [date, setDate]       = useState<'Today' | 'Tomorrow'>(defaultDate ?? 'Today')
  const [time, setTime]       = useState(defaultTime ?? '9:00 AM')
  const [address, setAddress] = useState('')
  const [checklist, setChecklist] = useState<string[]>(prepPresets['Plumbing'])
  const [newItem, setNewItem] = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})

  // Resolve the initially selected technician from props; fall back to first in list
  const initialTech = defaultTechnicianId
    ? (technicians.find(t => t.id === defaultTechnicianId) ?? technicians[0] ?? null)
    : (technicians[0] ?? null)
  const [technician, setTechnicianState] = useState<Technician | null>(initialTech)

  const handleServiceChange = (s: string) => {
    setService(s)
    setChecklist(prepPresets[s] ?? [])
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
    const cfg = serviceConfig[service]
    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      service,
      serviceIcon: cfg.icon,
      serviceColor: cfg.color,
      scheduledTime: time,
      scheduledDate: date,
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

  const isBooked = (t: string) => existingTimes.includes(`${date}-${t}`)

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
                value={service}
                onChange={e => handleServiceChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(serviceConfig).map(s => (
                  <option key={s} value={s}>{serviceConfig[s].icon} {s}</option>
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

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Date</label>
            <div className="flex gap-2">
              {(['Today', 'Tomorrow'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    date === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {d}
                </button>
              ))}
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
