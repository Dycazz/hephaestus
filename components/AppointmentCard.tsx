'use client'

import { Clock, MapPin, User, CheckSquare, Square, MessageSquare, Check, RefreshCw, XCircle, Star } from 'lucide-react'
import { Appointment } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  onSelect: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
}

const statusConfig = {
  scheduled: {
    badge: 'bg-slate-800/80 text-slate-400 border-slate-700',
    label: 'Not sent',
    dot: 'bg-slate-500',
  },
  reminder_sent: {
    badge: 'bg-amber-900/40 text-amber-400 border-amber-800/60',
    label: 'Awaiting reply',
    dot: 'bg-amber-400',
  },
  confirmed: {
    badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/60',
    label: 'Confirmed',
    dot: 'bg-emerald-500',
  },
  rescheduling: {
    badge: 'bg-purple-900/40 text-purple-400 border-purple-800/60',
    label: 'Rescheduling',
    dot: 'bg-purple-400',
  },
  at_risk: {
    badge: 'bg-red-900/40 text-red-400 border-red-800/60',
    label: 'No response',
    dot: 'bg-red-500',
  },
  completed: {
    badge: 'bg-indigo-900/40 text-indigo-400 border-indigo-800/60',
    label: 'Completed',
    dot: 'bg-indigo-400',
  },
  cancelled: {
    badge: 'bg-slate-800/60 text-slate-600 border-slate-700/60',
    label: 'Cancelled',
    dot: 'bg-slate-600',
  },
}

export function AppointmentCard({
  appointment,
  onSelect,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
}: AppointmentCardProps) {
  const { badge, label, dot } = statusConfig[appointment.status]
  const canSendReminder = appointment.status === 'scheduled' || appointment.status === 'at_risk'
  const canComplete = appointment.status === 'confirmed'
  const canCancel = !['completed', 'cancelled'].includes(appointment.status)

  return (
    <div
      className="rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.08)' }}
    >
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
              <p className="font-semibold text-white text-sm leading-tight">
                {appointment.customerName}
              </p>
              <p className="text-xs text-slate-400">{appointment.service}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-medium">
              {appointment.scheduledDate} at {appointment.scheduledTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{appointment.technician}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{appointment.address}</span>
          </div>
        </div>

        {/* Prep Checklist */}
        {appointment.prepChecklist.length > 0 && (
          <div className="mb-3 p-2.5 rounded-lg border"
            style={{ background: 'rgba(217,119,6,0.12)', borderColor: 'rgba(180,83,9,0.4)' }}
          >
            <p className="text-xs font-semibold text-amber-400 mb-1.5">Prep checklist</p>
            <ul className="space-y-1">
              {appointment.prepChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
                  {appointment.status === 'confirmed' ? (
                    <CheckSquare className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                  )}
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* At-risk note */}
        {appointment.status === 'at_risk' && appointment.notes && (
          <div className="mb-3 px-2.5 py-2 rounded-lg border text-xs text-red-400 font-medium"
            style={{ background: 'rgba(220,38,38,0.12)', borderColor: 'rgba(185,28,28,0.4)' }}
          >
            {appointment.notes}
          </div>
        )}

        {/* Review sent badge */}
        {appointment.reviewRequestSent && (
          <div className="mb-3 px-2.5 py-2 rounded-lg border text-xs text-amber-400 font-medium flex items-center gap-1.5"
            style={{ background: 'rgba(217,119,6,0.12)', borderColor: 'rgba(180,83,9,0.4)' }}
          >
            <Star className="w-3.5 h-3.5" />
            Review request sent
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onSelect(appointment.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            SMS Thread
            {appointment.smsThread.length > 0 && (
              <span className="ml-0.5 bg-slate-600/80 text-blue-200 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {appointment.smsThread.length}
              </span>
            )}
          </button>

          {canSendReminder && (
            <button
              onClick={() => onSendReminder(appointment.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-150 shadow-sm shadow-blue-900/40"
            >
              Send Reminder
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => onMarkComplete(appointment.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all duration-150 shadow-sm shadow-emerald-900/40"
            >
              <Check className="w-3.5 h-3.5" />
              Complete
            </button>
          )}

          {appointment.status === 'reminder_sent' && (
            <button
              onClick={() => onSelect(appointment.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg transition-all duration-150"
            >
              Simulate Reply
            </button>
          )}

          {appointment.status === 'rescheduling' && (
            <button
              onClick={() => onReschedule(appointment.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all duration-150 shadow-sm shadow-purple-900/40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Pick New Time
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:bg-red-900/25 hover:text-red-400 hover:border-red-800/50 text-slate-600 rounded-lg transition-all duration-150 ml-auto border border-transparent"
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
