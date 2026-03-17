'use client'

import { useState, useMemo } from 'react'
import { X, Clock, User, MapPin } from 'lucide-react'
import { Appointment } from '@/types'
import { DateTimePicker } from '@/components/DateTimePicker'
import { toISODate, formatDisplayDate } from '@/lib/dateUtils'

interface RescheduleModalProps {
  appointment: Appointment
  existingTimes: string[]
  onReschedule: (id: string, newDateISO: string, newTime: string) => void
  onClose: () => void
}

export function RescheduleModal({
  appointment,
  existingTimes,
  onReschedule,
  onClose,
}: RescheduleModalProps) {
  const todayISO = toISODate(new Date())

  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const bookedTimesForDate = useMemo(() => {
    if (!selectedDateISO) return []
    const displayDate = formatDisplayDate(selectedDateISO)
    const prefix = `${displayDate}-`
    const currentKey = `${appointment.scheduledDate}-${appointment.scheduledTime}`
    return existingTimes
      .filter(s => s.startsWith(prefix) && s !== currentKey)
      .map(s => s.slice(prefix.length))
  }, [existingTimes, selectedDateISO, appointment.scheduledDate, appointment.scheduledTime])

  const handleConfirm = () => {
    if (!selectedDateISO || !selectedTime) return
    onReschedule(appointment.id, selectedDateISO, selectedTime)
    onClose()
  }

  const confirmLabel = selectedDateISO && selectedTime
    ? `Confirm ${formatDisplayDate(selectedDateISO)} at ${selectedTime}`
    : 'Select a date & time'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/95 text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-lg font-semibold">Reschedule Appointment</p>
            <p className="text-sm text-white/60">Pick a new time for {appointment.customerName}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Current appointment</p>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {appointment.scheduledDate} at {appointment.scheduledTime}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <User className="w-3.5 h-3.5 shrink-0" />
              {appointment.technician}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {appointment.address}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/50">New Date & Time</label>
            <div className="rounded-xl border border-white/10 bg-black/80 p-3">
              <DateTimePicker
                date={selectedDateISO}
                time={selectedTime}
                onDateChange={d => { setSelectedDateISO(d); setSelectedTime(null) }}
                onTimeChange={setSelectedTime}
                bookedTimes={bookedTimesForDate}
                minDate={todayISO}
                accentColor="blue"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDateISO || !selectedTime}
              className="flex-grow rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
