'use client'

import { useState, useMemo } from 'react'
import { X, Clock, User, MapPin } from 'lucide-react'
import { Appointment } from '@/types'
import { DateTimePicker } from '@/components/DateTimePicker'
import { toISODate, formatDisplayDate } from '@/lib/dateUtils'

interface RescheduleModalProps {
  appointment: Appointment
  existingTimes: string[]
  // newDateISO is an ISO date string "YYYY-MM-DD" (not 'Today'|'Tomorrow')
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
  const [selectedTime, setSelectedTime]       = useState<string | null>(null)

  // Times already booked on the selected date (excluding this appointment's current slot)
  const bookedTimesForDate = useMemo(() => {
    if (!selectedDateISO) return []
    const displayDate = formatDisplayDate(selectedDateISO)
    const prefix      = `${displayDate}-`
    const currentKey  = `${appointment.scheduledDate}-${appointment.scheduledTime}`
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg">Reschedule Appointment</p>
              <p className="text-sm text-purple-100">Pick a new time for {appointment.customerName}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Current slot summary */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-purple-700 mb-1">Current appointment</p>
            <div className="flex items-center gap-2 text-xs text-purple-800">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {appointment.scheduledDate} at {appointment.scheduledTime}
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-800">
              <User className="w-3.5 h-3.5 shrink-0" />
              {appointment.technician}
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-800">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {appointment.address}
            </div>
          </div>

          {/* Date & Time picker */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">New Date & Time</label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <DateTimePicker
                date={selectedDateISO}
                time={selectedTime}
                onDateChange={d => { setSelectedDateISO(d); setSelectedTime(null) }}
                onTimeChange={setSelectedTime}
                bookedTimes={bookedTimesForDate}
                minDate={todayISO}
                accentColor="purple"
              />
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
              onClick={handleConfirm}
              disabled={!selectedDateISO || !selectedTime}
              className="flex-grow py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
