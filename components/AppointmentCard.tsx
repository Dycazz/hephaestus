'use client'

import { Clock, MapPin, User, CheckSquare, Square, MessageSquare, Check, RefreshCw, XCircle, Star } from 'lucide-react'
import { Appointment } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  onSelect: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
}

const statusConfig = {
  scheduled: {
    badge: 'bg-slate-100 text-slate-600 border-slate-300',
    label: 'Not Sent',
    dot: 'bg-slate-400',
  },
  reminder_sent: {
    badge: 'bg-amber-100 text-amber-700 border-amber-300',
    label: 'Awaiting Reply',
    dot: 'bg-amber-400 animate-pulse',
  },
  confirmed: {
    badge: 'bg-green-100 text-green-700 border-green-300',
    label: 'Confirmed ✓',
    dot: 'bg-green-500',
  },
  rescheduling: {
    badge: 'bg-purple-100 text-purple-700 border-purple-300',
    label: 'Rescheduling',
    dot: 'bg-purple-400',
  },
  at_risk: {
    badge: 'bg-red-100 text-red-700 border-red-300',
    label: 'No Response',
    dot: 'bg-red-500 animate-pulse',
  },
  completed: {
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    label: 'Completed',
    dot: 'bg-blue-500',
  },
  cancelled: {
    badge: 'bg-slate-100 text-slate-500 border-slate-300',
    label: 'Cancelled',
    dot: 'bg-slate-400',
  },
}

export function AppointmentCard({
  appointment,
  onSelect,
  onSendReminder,
  onMarkComplete,
  onCancel,
}: AppointmentCardProps) {
  const { badge, label, dot } = statusConfig[appointment.status]
  const canSendReminder = appointment.status === 'scheduled' || appointment.status === 'at_risk'
  const canComplete = appointment.status === 'confirmed'
  const canCancel = !['completed', 'cancelled'].includes(appointment.status)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          appointment.status === 'confirmed'
            ? 'bg-green-500'
            : appointment.status === 'at_risk'
            ? 'bg-red-500'
            : appointment.status === 'completed'
            ? 'bg-blue-500'
            : appointment.status === 'rescheduling'
            ? 'bg-purple-500'
            : 'bg-amber-400'
        }`}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{appointment.serviceIcon}</span>
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">
                {appointment.customerName}
              </p>
              <p className="text-xs text-slate-500">{appointment.service}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium">
              {appointment.scheduledDate} at {appointment.scheduledTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{appointment.technician}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{appointment.address}</span>
          </div>
        </div>

        {/* Prep Checklist */}
        {appointment.prepChecklist.length > 0 && (
          <div className="mb-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">📋 Prep Checklist Sent</p>
            <ul className="space-y-1">
              {appointment.prepChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                  {appointment.status === 'confirmed' ? (
                    <CheckSquare className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  )}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* At-risk note */}
        {appointment.status === 'at_risk' && appointment.notes && (
          <div className="mb-3 px-2.5 py-2 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 font-medium">
            {appointment.notes}
          </div>
        )}

        {/* Review sent badge */}
        {appointment.reviewRequestSent && (
          <div className="mb-3 px-2.5 py-2 bg-yellow-50 rounded-lg border border-yellow-200 text-xs text-yellow-700 font-medium flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Google review request sent!
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onSelect(appointment.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            SMS Thread
            {appointment.smsThread.length > 0 && (
              <span className="ml-0.5 bg-slate-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {appointment.smsThread.length}
              </span>
            )}
          </button>

          {canSendReminder && (
            <button
              onClick={() => onSendReminder(appointment.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Send Reminder
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => onMarkComplete(appointment.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Complete
            </button>
          )}

          {appointment.status === 'reminder_sent' && (
            <button
              onClick={() => onSelect(appointment.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Simulate Reply
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-lg transition-colors ml-auto"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
