'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, MapPin, User, CheckSquare, Square, MessageSquare, Check, RefreshCw, XCircle, Star, UserPlus, BellOff } from 'lucide-react'
import { Appointment } from '@/types'
import { Technician } from '@/hooks/useTechnicians'

interface AppointmentCardProps {
  appointment: Appointment
  technicians: Technician[]
  readOnly?: boolean
  onSelect: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
  onScheduleFollowUp: (appointment: Appointment) => void
  onAssignTechnician: (appointmentId: string, technicianId: string, technicianName: string) => void
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
  technicians,
  readOnly = false,
  onSelect,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
  onScheduleFollowUp,
  onAssignTechnician,
}: AppointmentCardProps) {
  const { badge, label, dot } = statusConfig[appointment.status]
  const canSendReminder = (appointment.status === 'scheduled' || appointment.status === 'at_risk')
  const canComplete = ['confirmed', 'scheduled', 'reminder_sent', 'at_risk'].includes(appointment.status)
  const isCompleted = appointment.status === 'completed'
  const canCancel = !['completed', 'cancelled'].includes(appointment.status)
  const canAssign = !['completed', 'cancelled'].includes(appointment.status)
  const isUnassigned = appointment.technician === 'Unassigned'

  const [showTechPicker, setShowTechPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    if (!showTechPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowTechPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTechPicker])

  return (
    <div
      className="rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden bg-surface border border-border"
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
              <p className="font-semibold text-text-primary text-sm leading-tight">
                {appointment.customerName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-text-secondary/70">{appointment.service}</p>
                {appointment.priceCents != null && (
                  <span className="text-[10px] font-semibold text-emerald-500/80">
                    {appointment.priceCents === 0 ? 'Free' : `$${(appointment.priceCents / 100).toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="font-medium">
              {appointment.scheduledDate} at {appointment.scheduledTime}
            </span>
          </div>

          {/* Technician row with inline picker */}
          <div className="relative" ref={pickerRef}>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span className={isUnassigned ? 'text-text-muted italic' : ''}>
                {appointment.technician}
              </span>
              {canAssign && !readOnly && (
                <button
                  onClick={() => setShowTechPicker(v => !v)}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface-elevated text-text-secondary hover:text-text-primary transition-all duration-150"
                >
                  {isUnassigned ? (
                    <>
                      <UserPlus className="w-2.5 h-2.5" />
                      Assign
                    </>
                  ) : (
                    '✎'
                  )}
                </button>
              )}
            </div>

            {/* Technician picker dropdown */}
            {showTechPicker && (
              <div
                className="absolute left-0 top-6 z-20 min-w-[170px] rounded-xl border shadow-2xl py-1"
                style={{ background: '#1e2130', borderColor: 'rgba(255,255,255,0.14)' }}
              >
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Assign technician
                </p>
                {technicians.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No technicians added yet</p>
                ) : (
                  technicians.map(tech => (
                    <button
                      key={tech.id}
                      onClick={() => {
                        onAssignTechnician(appointment.id, tech.id, tech.name)
                        setShowTechPicker(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 transition-colors flex items-center gap-2"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(217,119,6,0.2)', color: '#d97706' }}
                      >
                        {tech.initials || tech.name.charAt(0)}
                      </span>
                      {tech.name}
                      {appointment.technicianId === tech.id && (
                        <Check className="w-3 h-3 text-emerald-400 ml-auto" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
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

        {/* No-reminder badge */}
        {!appointment.autoReminder && (
          <div className="mb-3 px-2.5 py-2 rounded-lg border text-xs text-slate-400 font-medium flex items-center gap-1.5"
            style={{ background: 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.25)' }}
          >
            <BellOff className="w-3.5 h-3.5" />
            No auto-reminder
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

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onSelect(appointment.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
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
              disabled={readOnly}
              title={readOnly ? "Account permissions required" : ""}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 shadow-sm ${
                readOnly 
                  ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border-white/5 opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
              }`}
            >
              Send Reminder
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => onMarkComplete(appointment.id)}
              disabled={readOnly}
              title={readOnly ? "Account permissions required" : ""}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 shadow-sm ${
                readOnly 
                  ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border-white/5 opacity-50' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Complete Job
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => onScheduleFollowUp(appointment)}
              disabled={readOnly}
              title={readOnly ? "Account permissions required" : ""}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 shadow-sm ${
                readOnly 
                  ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border-white/5 opacity-50' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Schedule Follow-up
            </button>
          )}

          {appointment.status === 'rescheduling' && (
            <button
              onClick={() => onReschedule(appointment.id)}
              disabled={readOnly}
              title={readOnly ? "Account permissions required" : ""}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 shadow-sm ${
                readOnly 
                  ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border-white/5 opacity-50' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Pick New Time
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => onCancel(appointment.id)}
              disabled={readOnly}
              title={readOnly ? "Account permissions required" : ""}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ml-auto border border-transparent ${
                readOnly 
                  ? 'text-slate-700 cursor-not-allowed opacity-50' 
                  : 'hover:bg-red-900/25 hover:text-red-400 hover:border-red-800/50 text-slate-600'
              }`}
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
