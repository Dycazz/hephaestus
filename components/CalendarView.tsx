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
  scheduled:     { bg: 'bg-slate-800/70',  border: 'border-slate-500',  text: 'text-slate-200',  badge: 'bg-slate-700/80 text-slate-300',   badgeText: 'Not Sent'     },
  reminder_sent: { bg: 'bg-amber-900/50',  border: 'border-amber-500',  text: 'text-amber-100',  badge: 'bg-amber-800/60 text-amber-300',   badgeText: '⏳ Pending'   },
  confirmed:     { bg: 'bg-green-900/50',  border: 'border-green-500',  text: 'text-green-100',  badge: 'bg-green-800/60 text-green-300',   badgeText: '✓ Confirmed'  },
  rescheduling:  { bg: 'bg-purple-900/50', border: 'border-purple-500', text: 'text-purple-100', badge: 'bg-purple-800/60 text-purple-300', badgeText: '↻ Reschedule' },
  at_risk:       { bg: 'bg-red-900/50',    border: 'border-red-500',    text: 'text-red-100',    badge: 'bg-red-800/60 text-red-300',       badgeText: '⚠ At Risk'   },
  completed:     { bg: 'bg-blue-900/50',   border: 'border-blue-500',   text: 'text-blue-100',   badge: 'bg-blue-800/60 text-blue-300',     badgeText: '✓ Done'      },
  cancelled:     { bg: 'bg-slate-900/50',  border: 'border-slate-700',  text: 'text-slate-500',  badge: 'bg-slate-800/60 text-slate-500',   badgeText: 'Cancelled'   },
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
      <div
        className="rounded-2xl flex items-center justify-center py-20"
        style={{ background: 'linear-gradient(135deg, #0d1f3c, #0f2040)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-sm text-slate-600">No technicians yet. Add team members using the Team button above.</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl"
      style={{ background: 'linear-gradient(180deg, #0d1f3c 0%, #0f2040 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-blue-400/70" />
          <h2 className="text-sm font-semibold text-white/90">Technician Schedule</h2>
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-full px-2 py-0.5">
            {dayAppts.length} job{dayAppts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-1">
          {(['Today', 'Tomorrow'] as const).map(d => (
            <button
              key={d}
              onClick={() => onCalendarDateChange(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                calendarDate === d
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/40'
                  : 'text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
              }`}
              style={calendarDate !== d ? { background: 'rgba(255,255,255,0.04)' } : undefined}
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
            className="grid border-b sticky top-0 z-10"
            style={{
              gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)`,
              borderColor: 'rgba(255,255,255,0.07)',
              background: 'linear-gradient(180deg, #0d1f3c, #0e2240)',
            }}
          >
            <div className="px-3 py-3 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            {technicians.map(tech => {
              const count = techJobCount(tech.name)
              return (
                <div
                  key={tech.id}
                  className="px-3 py-3 border-l flex items-center gap-2.5"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className={`w-7 h-7 rounded-full ${colorBg[tech.color] ?? 'bg-slate-500'} flex items-center justify-center shrink-0 shadow-md`}>
                    <span className="text-[10px] font-bold text-white">{tech.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/85 truncate">{tech.name}</p>
                    <p className="text-[10px] text-slate-600">
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
              className="grid border-b"
              style={{
                gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)`,
                borderColor: 'rgba(255,255,255,0.04)',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              }}
            >
              <div className="px-3 py-2 flex items-start justify-end border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-[11px] font-medium text-slate-600 mt-1">{time}</span>
              </div>

              {technicians.map(tech => {
                const appt = getAppt(tech.name, time)
                const style = appt ? statusBlock[appt.status] : null

                return (
                  <div key={tech.id} className="border-l p-1.5 min-h-[64px]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {appt && style ? (
                      <button
                        onClick={() => onSelectAppointment(appt.id)}
                        className={`w-full h-full min-h-[52px] rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-all duration-150 hover:brightness-110 ${style.bg} ${style.border} ${style.text}`}
                      >
                        <p className="text-xs font-semibold truncate leading-tight">
                          {appt.serviceIcon} {appt.customerName}
                        </p>
                        <p className="text-[10px] opacity-50 truncate mt-0.5">{appt.service} · {appt.address}</p>
                        <span className={`mt-1.5 inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-white/10 ${style.badge}`}>
                          {style.badgeText}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddAtSlot(tech.id, tech.name, time, calendarDate)}
                        className="w-full h-full min-h-[52px] rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 transition-all duration-150 group"
                        style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.1)' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
                          e.currentTarget.style.background = 'rgba(59,130,246,0.06)'
                          e.currentTarget.style.color = 'rgba(147,197,253,0.7)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
      <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Legend</span>
        {[
          { color: 'bg-green-500',  label: 'Confirmed' },
          { color: 'bg-amber-500',  label: 'Pending' },
          { color: 'bg-red-500',    label: 'At Risk' },
          { color: 'bg-purple-500', label: 'Rescheduling' },
          { color: 'bg-blue-500',   label: 'Completed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color} opacity-80`} />
            <span className="text-[10px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
