'use client'

import { useState, useEffect } from 'react'
import { X, Clock, Loader2, Check } from 'lucide-react'
import { TechnicianAvailability } from '@/types'

interface TechnicianAvailabilityModalProps {
  technicianId: string
  technicianName: string
  onClose: () => void
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildTimeOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = []
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) break
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const period = h < 12 ? 'AM' : 'PM'
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      opts.push({ label: `${h12}:${String(m).padStart(2, '0')} ${period}`, value: val })
    }
  }
  return opts
}

const TIME_OPTIONS = buildTimeOptions()

const DEFAULT_AVAIL = (technicianId: string): TechnicianAvailability[] =>
  Array.from({ length: 7 }, (_, i) => ({
    id: '',
    orgId: '',
    technicianId,
    dayOfWeek: i,
    startTime: '08:00',
    endTime: '17:00',
    isWorking: i >= 1 && i <= 5,
  }))

export function TechnicianAvailabilityModal({
  technicianId,
  technicianName,
  onClose,
}: TechnicianAvailabilityModalProps) {
  const [avail, setAvail] = useState<TechnicianAvailability[]>(() => DEFAULT_AVAIL(technicianId))
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/technicians/${technicianId}/availability`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.availability) setAvail(json.availability) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [technicianId])

  const updateDay = (
    dayOfWeek: number,
    field: 'isWorking' | 'startTime' | 'endTime',
    value: boolean | string
  ) => {
    setAvail(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/technicians/${technicianId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(avail),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError((j as { error?: string }).error ?? 'Failed to save')
      } else {
        setSaved(true)
        setTimeout(() => { setSaved(false); onClose() }, 900)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-5 rounded-t-2xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-slate-300 shrink-0" />
              <div>
                <p className="font-bold text-base leading-tight">Working Hours</p>
                <p className="text-sm text-slate-300 leading-tight">{technicianName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-3">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="space-y-2">
              {[...avail].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(day => (
                <div
                  key={day.dayOfWeek}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    day.isWorking
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => updateDay(day.dayOfWeek, 'isWorking', !day.isWorking)}
                    aria-label={day.isWorking ? 'Mark as day off' : 'Mark as working'}
                    className={`w-10 h-5 rounded-full flex items-center transition-colors shrink-0 ${
                      day.isWorking ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow mx-0.5 block" />
                  </button>

                  {/* Day name */}
                  <span className={`w-24 text-sm font-semibold shrink-0 ${day.isWorking ? 'text-slate-700' : 'text-slate-400'}`}>
                    {DAY_NAMES[day.dayOfWeek]}
                  </span>

                  {/* Time range */}
                  {day.isWorking ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <select
                        value={day.startTime}
                        onChange={e => updateDay(day.dayOfWeek, 'startTime', e.target.value)}
                        className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TIME_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 text-xs shrink-0">to</span>
                      <select
                        value={day.endTime}
                        onChange={e => updateDay(day.dayOfWeek, 'endTime', e.target.value)}
                        className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {TIME_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Day off</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-grow py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-70 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              'Save Hours'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
