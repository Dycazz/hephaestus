'use client'

import { useState } from 'react'
import { X, Clock, User, MapPin } from 'lucide-react'
import { Appointment } from '@/types'

interface RescheduleModalProps {
  appointment: Appointment
  existingTimes: string[]
  onReschedule: (id: string, newDate: 'Today' | 'Tomorrow', newTime: string) => void
  onClose: () => void
}

const timeSlots = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',  '5:00 PM', '6:00 PM',
]

export function RescheduleModal({ appointment, existingTimes, onReschedule, onClose }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<'Today' | 'Tomorrow'>(
    appointment.scheduledDate === 'Today' ? 'Today' : 'Tomorrow'
  )
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // A slot is a conflict if it's booked by another appointment (not this one)
  const isConflict = (d: string, t: string) => {
    const key = `${d}-${t}`
    const currentKey = `${appointment.scheduledDate}-${appointment.scheduledTime}`
    return existingTimes.includes(key) && key !== currentKey
  }

  const handleConfirm = () => {
    if (!selectedTime) return
    onReschedule(appointment.id, selectedDate, selectedTime)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

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

          {/* Date toggle */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">New Date</label>
            <div className="flex gap-2">
              {(['Today', 'Tomorrow'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedTime(null) }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedDate === d
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time slot grid */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">New Time</label>
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map(t => {
                const conflict  = isConflict(selectedDate, t)
                const isCurrent = t === appointment.scheduledTime && selectedDate === appointment.scheduledDate
                const selected  = selectedTime === t
                return (
                  <button
                    key={t}
                    onClick={() => !conflict && setSelectedTime(t)}
                    disabled={conflict}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      conflict
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : selected
                        ? 'bg-purple-600 text-white border-purple-600'
                        : isCurrent
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                    }`}
                  >
                    {t}
                    {isCurrent && !selected && <span className="block text-[9px] text-amber-500">Current</span>}
                    {conflict && <span className="block text-[9px] text-slate-400">Booked</span>}
                  </button>
                )
              })}
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
              disabled={!selectedTime}
              className="flex-grow py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {selectedTime ? `Confirm ${selectedDate} at ${selectedTime}` : 'Select a time slot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
