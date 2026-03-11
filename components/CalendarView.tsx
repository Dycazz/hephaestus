'use client'

import { Plus, Clock } from 'lucide-react'
import { Appointment } from '@/types'
import { timeSlots } from '@/lib/mockData'
import type { Technician } from '@/hooks/useTechnicians'

interface CalendarViewProps {
  appointments: Appointment[]
  technicians: Technician[]
  calendarDate: 'Today' | 'Tomorrow'
  onCalendarDateChange: (date: 'Today' | 'Tomorrow') => void
  onSelectAppointment: (id: string) => void
  onAddAtSlot: (technicianId: string, technicianName: string, time: string, date: 'Today' | 'Tomorrow') => void
}

const statusBlock: Record<string, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  scheduled:    { bg: 'bg-slate-50',   border: 'border-slate-400',  text: 'text-slate-700',  badge: 'bg-slate-200 text-slate-600',   badgeText: 'Not Sent'     },
  reminder_sent:{ bg: 'bg-amber-50',   border: 'border-amber-400',  text: 'text-amber-800',  badge: 'bg-amber-200 text-amber-700',   badgeText: '⏳ Pending'   },
  confirmed:    { bg: 'bg-green-50',   border: 'border-green-500',  text: 'text-green-800',  badge: 'bg-green-200 text-green-700',   badgeText: '✓ Confirmed'  },
  rescheduling: { bg: 'bg-purple-50',  border: 'border-purple-400', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-700', badgeText: '↻ Reschedule' },
  at_risk:      { bg: 'bg-red-50',     border: 'border-red-500',    text: 'text-red-800',    badge: 'bg-red-200 text-red-700',       badgeText: '⚠ At Risk'   },
  completed:    { bg: 'bg-blue-50',    border: 'border-blue-400',   text: 'text-blue-800',   badge: 'bg-blue-200 text-blue-700',     badgeText: '✓ Done'      },
  cancelled:    { bg: 'bg-slate-50',   border: 'border-slate-200',  text: 'text-slate-400',  badge: 'bg-slate-100 text-slate-400',   badgeText: 'Cancelled'   },
}

/** Map the technician color string to a Tailwind bg class for the avatar. */
const colorBg: Record<string, string> = {
  blue:    'bg-blue-500',
  purple:  'bg-purple-500',
  emerald: 'bg-emerald-500',
  orange:  'bg-orange-500',
  green:   'bg-green-500',
  red:     'bg-red-500',
  yellow:  'bg-yellow-500',
  pink:    'bg-pink-500',
  indigo:  'bg-indigo-500',
  teal:    'bg-teal-500',
  cyan:    'bg-cyan-500',
  slate:   'bg-slate-500',
}

export function CalendarView({
  appointments,
  technicians,
  calendarDate,
  onCalendarDateChange,
  onSelectAppointment,
  onAddAtSlot,
}: CalendarViewProps) {
  const dayAppts = appointments.filter(
    a => a.scheduledDate === calendarDate && a.status !== 'cancelled'
  )

  const getAppt = (techName: string, time: string) =>
    dayAppts.find(a => a.technician === techName && a.scheduledTime === time) ?? null

  const techJobCount = (techName: string) =>
    appointments.filter(
      a => a.technician === techName && a.scheduledDate === calendarDate && a.status !== 'cancelled'
    ).length

  if (technicians.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">No technicians yet. Add team members using the Team button above.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Technician Schedule</h2>
          <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
            {dayAppts.length} job{dayAppts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-1.5">
          {(['Today', 'Tomorrow'] as const).map(d => (
            <button
              key={d}
              onClick={() => onCalendarDateChange(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                calendarDate === d
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${120 + technicians.length * 180}px` }}>

          {/* Technician column headers */}
          <div
            className="grid border-b border-slate-200 sticky top-0 bg-white z-10"
            style={{ gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)` }}
          >
            <div className="px-3 py-3 bg-slate-50 border-r border-slate-100" />
            {technicians.map(tech => {
              const count = techJobCount(tech.name)
              return (
                <div key={tech.id} className="px-3 py-3 border-l border-slate-100 bg-slate-50 flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full ${colorBg[tech.color] ?? 'bg-slate-400'} flex items-center justify-center shrink-0`}>
                    <span className="text-[10px] font-bold text-white">{tech.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{tech.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {count === 0 ? 'No jobs' : `${count} job${count > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          {timeSlots.map((time, idx) => (
            <div
              key={time}
              className={`grid border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
              style={{ gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)` }}
            >
              <div className="px-3 py-2 flex items-start justify-end border-r border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 mt-1">{time}</span>
              </div>

              {technicians.map(tech => {
                const appt = getAppt(tech.name, time)
                const style = appt ? statusBlock[appt.status] : null

                return (
                  <div key={tech.id} className="border-l border-slate-100 p-1.5 min-h-[64px]">
                    {appt && style ? (
                      <button
                        onClick={() => onSelectAppointment(appt.id)}
                        className={`w-full h-full min-h-[52px] rounded-lg border-l-[3px] px-2.5 py-2 text-left hover:brightness-95 transition-all ${style.bg} ${style.border} ${style.text}`}
                      >
                        <p className="text-xs font-semibold truncate leading-tight">
                          {appt.serviceIcon} {appt.customerName}
                        </p>
                        <p className="text-[10px] opacity-60 truncate mt-0.5">{appt.service} · {appt.address}</p>
                        <span className={`mt-1.5 inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                          {style.badgeText}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddAtSlot(tech.id, tech.name, time, calendarDate)}
                        className="w-full h-full min-h-[52px] rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50/60 transition-all group"
                      >
                        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Book slot
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t border-slate-100 bg-slate-50">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Legend</span>
        {[
          { color: 'bg-green-400',  label: 'Confirmed' },
          { color: 'bg-amber-400',  label: 'Pending' },
          { color: 'bg-red-400',    label: 'At Risk' },
          { color: 'bg-purple-400', label: 'Rescheduling' },
          { color: 'bg-blue-400',   label: 'Completed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
