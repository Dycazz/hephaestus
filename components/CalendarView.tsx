'use client'

import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { Appointment } from '@/types'
import { timeSlots } from '@/lib/mockData'
import type { Technician } from '@/hooks/useTechnicians'

interface CalendarViewProps {
  appointments: Appointment[]
  technicians: Technician[]
  calendarDate: string  // ISO date YYYY-MM-DD
  onCalendarDateChange: (date: string) => void
  onSelectAppointment: (id: string) => void
  onAddAtSlot: (technicianId: string, technicianName: string, time: string, date: string) => void
  readOnly?: boolean
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  // Use local time (not UTC) so "Today" always matches the user's wall-clock date
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(iso: string): string {
  const todayDate = new Date()
  const todayISO = toISODate(todayDate)
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowISO = toISODate(tomorrowDate)
  if (iso === todayISO) return 'Today'
  if (iso === tomorrowISO) return 'Tomorrow'
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatHeaderDate(iso: string): string {
  const todayDate = new Date()
  const todayISO = toISODate(todayDate)
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowISO = toISODate(tomorrowDate)
  if (iso === todayISO) return 'Today'
  if (iso === tomorrowISO) return 'Tomorrow'
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// ─── Styling maps ─────────────────────────────────────────────────────────────

const statusBlock: Record<string, { bg: string; border: string; text: string; badge: string; badgeText: string }> = {
  scheduled:     { bg: 'bg-surface-elevated', border: 'border-border',      text: 'text-text-secondary',  badge: 'bg-surface/50 text-text-muted',    badgeText: 'Not sent'    },
  reminder_sent: { bg: 'bg-amber-500/15',     border: 'border-amber-500',   text: 'text-text-primary',    badge: 'bg-amber-500/20 text-text-primary', badgeText: 'Pending'     },
  confirmed:     { bg: 'bg-orange-500/20',    border: 'border-orange-500',  text: 'text-text-primary',    badge: 'bg-orange-500/25 text-text-primary', badgeText: 'Confirmed'   },
  rescheduling:  { bg: 'bg-orange-500/15',    border: 'border-orange-400',  text: 'text-text-primary',    badge: 'bg-orange-500/20 text-text-primary', badgeText: 'Rescheduling'},
  at_risk:       { bg: 'bg-red-500/15',       border: 'border-red-500',     text: 'text-text-primary',    badge: 'bg-red-500/20 text-text-primary',   badgeText: 'At risk'     },
  completed:     { bg: 'bg-surface-elevated', border: 'border-border',      text: 'text-text-secondary',  badge: 'bg-surface/50 text-text-muted',    badgeText: 'Done'        },
  cancelled:     { bg: 'bg-surface',          border: 'border-border',      text: 'text-text-muted',      badge: 'bg-surface/30 text-text-muted',    badgeText: 'Cancelled'   },
}

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
  readOnly = false,
}: CalendarViewProps) {
  const todayISO = toISODate(new Date())
  const displayDate = formatDisplayDate(calendarDate)

  // Filter appointments for the currently shown date
  const dayAppts = appointments.filter(
    a => a.scheduledDate === displayDate && a.status !== 'cancelled' && a.status !== 'completed'
  )

  const getAppt = (techName: string, time: string) =>
    dayAppts.find(a => a.technician === techName && a.scheduledTime === time) ?? null

  const techJobCount = (techName: string) =>
    dayAppts.filter(a => a.technician === techName).length

  if (technicians.length === 0) {
    return (
      <div className="rounded-2xl flex items-center justify-center py-20 bg-surface border border-border">
        <p className="text-sm text-text-muted">No technicians yet. Add team members using the Team button above.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl bg-surface border border-border">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-elevated/30">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-orange-400/80" />
          <h2 className="text-sm font-semibold text-text-primary/90">Technician Schedule</h2>
          <span className="text-xs rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-orange-400">
            {dayAppts.length} job{dayAppts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1">
          {/* Prev day */}
          <button
            onClick={() => onCalendarDateChange(addDays(calendarDate, -1))}
            disabled={calendarDate <= todayISO}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Today quick-jump */}
          {calendarDate !== todayISO && (
            <button
              onClick={() => onCalendarDateChange(todayISO)}
              className="rounded-lg border border-orange-500/30 px-2 py-1 text-xs font-medium text-orange-400 transition-all hover:bg-orange-500/10"
            >
              Today
            </button>
          )}

          {/* Current date label */}
          <span className="px-3 py-1 text-sm font-semibold text-text-primary min-w-[90px] text-center">
            {formatHeaderDate(calendarDate)}
          </span>

          {/* Next day */}
          <button
            onClick={() => onCalendarDateChange(addDays(calendarDate, 1))}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${120 + technicians.length * 180}px` }}>

          {/* Technician column headers */}
          <div
            className="grid border-b sticky top-0 z-10 border-border bg-surface"
            style={{
              gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)`,
            }}
          >
            <div className="px-3 py-3 border-r border-border" />
            {technicians.map(tech => {
              const count = techJobCount(tech.name)
              return (
                <div
                  key={tech.id}
                  className="px-3 py-3 border-l border-border flex items-center gap-2.5"
                >
                  <div className={`w-7 h-7 rounded-full ${colorBg[tech.color] ?? 'bg-slate-500'} flex items-center justify-center shrink-0 shadow-md`}>
                    <span className="text-[10px] font-bold text-white">{tech.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary/85 truncate">{tech.name}</p>
                    <p className="text-[10px] text-text-muted">
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
              className="grid border-b border-border/50"
              style={{
                gridTemplateColumns: `88px repeat(${technicians.length}, 1fr)`,
                background: idx % 2 === 0 ? 'transparent' : 'var(--surface-elevated)',
                opacity: idx % 2 === 0 ? 1 : 0.3,
              }}
            >
              <div className="px-3 py-2 flex items-start justify-end border-r border-border">
                <span className="text-[11px] font-medium text-text-muted mt-1">{time}</span>
              </div>

              {technicians.map(tech => {
                const appt = getAppt(tech.name, time)
                const style = appt ? statusBlock[appt.status] : null

                return (
                  <div key={tech.id} className="border-l border-border/50 p-1.5 min-h-[64px]">
                    {appt && style ? (
                      <button
                        onClick={() => onSelectAppointment(appt.id)}
                        className={`w-full h-full min-h-[52px] rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-all duration-150 hover:brightness-110 ${style.bg} ${style.border} ${style.text}`}
                      >
                        <p className="text-xs font-semibold truncate leading-tight">
                          {appt.serviceIcon} {appt.customerName}
                        </p>
                        <p className="text-[10px] opacity-50 truncate mt-0.5">{appt.service} · {appt.address}</p>
                        <span className={`mt-1.5 inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-black/5 ${style.badge}`}>
                          {style.badgeText}
                        </span>
                      </button>
                    ) : !readOnly ? (
                      <button
                        onClick={() => onAddAtSlot(tech.id, tech.name, time, calendarDate)}
                        className="w-full h-full min-h-[52px] rounded-lg border border-dashed border-border/20 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 group text-text-muted/30"
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.background = 'var(--accent-dim)'
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = ''
                          e.currentTarget.style.background = ''
                          e.currentTarget.style.color = ''
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          Book slot
                        </span>
                      </button>
                    ) : (
                      <div className="w-full h-full min-h-[52px]" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}

        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t border-border bg-surface-elevated/50">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Legend</span>
        {[
          { color: 'bg-green-500',  label: 'Confirmed' },
          { color: 'bg-amber-500',  label: 'Pending' },
          { color: 'bg-red-500',    label: 'At Risk' },
          { color: 'bg-purple-500', label: 'Rescheduling' },
          { color: 'bg-blue-500',   label: 'Completed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color} opacity-80`} />
            <span className="text-[10px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
