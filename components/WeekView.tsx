'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Appointment } from '@/types'
import { toISODate, addDays, getWeekStart, formatWeekDayDate } from '@/lib/dateUtils'

interface WeekViewProps {
  appointments: Appointment[]
  onSelectAppointment: (id: string) => void
  onAddAtSlot?: (isoDate: string, time: string) => void
  readOnly?: boolean
}

const HOUR_HEIGHT = 64   // px per hour
const DAY_START   = 6    // 6 AM
const DAY_END     = 22   // 10 PM
const TOTAL_PX    = (DAY_END - DAY_START) * HOUR_HEIGHT  // 960px

const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

// Service colour → Tailwind classes (bg, text, left-border)
const SVC: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: 'bg-blue-500',   text: 'text-white',       border: 'border-blue-400' },
  cyan:   { bg: 'bg-cyan-500',   text: 'text-white',       border: 'border-cyan-400' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-900',  border: 'border-yellow-300' },
  orange: { bg: 'bg-orange-500', text: 'text-white',       border: 'border-orange-400' },
  green:  { bg: 'bg-green-500',  text: 'text-white',       border: 'border-green-400' },
  purple: { bg: 'bg-purple-500', text: 'text-white',       border: 'border-purple-400' },
  red:    { bg: 'bg-red-500',    text: 'text-white',       border: 'border-red-400' },
  teal:   { bg: 'bg-teal-500',   text: 'text-white',       border: 'border-teal-400' },
  pink:   { bg: 'bg-pink-500',   text: 'text-white',       border: 'border-pink-400' },
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function apptTopPx(scheduledAt: string): number {
  const d = new Date(scheduledAt)
  return (d.getHours() - DAY_START) * HOUR_HEIGHT + (d.getMinutes() / 60) * HOUR_HEIGHT
}

function timeFromY(y: number): string {
  const totalMin = (y / HOUR_HEIGHT) * 60 + DAY_START * 60
  const rounded  = Math.round(totalMin / 30) * 30
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function WeekView({ appointments, onSelectAppointment, onAddAtSlot, readOnly = false }: WeekViewProps) {
  const today = toISODate(new Date())
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to 7 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (7 - DAY_START) * HOUR_HEIGHT - 8
    }
  }, [])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i))),
    [weekStart]
  )

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(getWeekStart(new Date()))

  // Group non-cancelled appointments by ISO date
  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const iso of weekDays) map[iso] = []
    for (const a of appointments) {
      if (!a.scheduledAt || a.status === 'cancelled') continue
      const day = toISODate(new Date(a.scheduledAt))
      if (map[day]) map[day].push(a)
    }
    return map
  }, [appointments, weekDays])

  // Week range label
  const weekLabel = useMemo(() => {
    const s = new Date(weekDays[0] + 'T12:00:00')
    const e = new Date(weekDays[6] + 'T12:00:00')
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', opts)} – ${e.getDate()}, ${e.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}, ${e.getFullYear()}`
  }, [weekDays])

  // Current time indicator position
  const nowTop = useMemo(() => {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    if (h < DAY_START || h >= DAY_END) return null
    return (h - DAY_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT
  }, [])

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#0d0f17' }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white ml-1">{weekLabel}</span>
        </div>
        <button
          onClick={goToday}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Today
        </button>
      </div>

      {/* ── Scrollable grid ───────────────────────────────────────────────────── */}
      <div className="overflow-auto" ref={scrollRef} style={{ maxHeight: '70vh' }}>
        <div className="min-w-[560px]">

          {/* ── Day header row (sticky) ───────────────────────────────────────── */}
          <div
            className="flex sticky top-0 z-20"
            style={{ background: '#0d0f17', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Time gutter */}
            <div className="w-14 shrink-0" />

            {weekDays.map(iso => {
              const { weekday } = formatWeekDayDate(iso)
              const dayNum  = new Date(iso + 'T12:00:00').getDate()
              const isToday = iso === today
              return (
                <div key={iso} className="flex-1 py-2 text-center">
                  <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                    {weekday}
                  </div>
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mt-0.5 text-sm font-bold ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}>
                    {dayNum}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Body: time axis + day columns ────────────────────────────────── */}
          <div className="flex">

            {/* Time labels */}
            <div className="w-14 shrink-0 relative select-none" style={{ height: TOTAL_PX }}>
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-slate-600 font-medium leading-none"
                  style={{ top: (h - DAY_START) * HOUR_HEIGHT - 6 }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(iso => {
              const dayAppts = apptsByDay[iso] ?? []
              const isToday  = iso === today
              return (
                <div
                  key={iso}
                  className="flex-1 relative"
                  style={{
                    height: TOTAL_PX,
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: isToday ? 'rgba(59,130,246,0.03)' : undefined,
                    cursor: (onAddAtSlot && !readOnly) ? 'pointer' : 'default',
                  }}
                  onClick={e => {
                    if (!onAddAtSlot || readOnly) return
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                    const y = e.clientY - rect.top
                    onAddAtSlot(iso, timeFromY(Math.max(0, Math.min(y, TOTAL_PX - 1))))
                  }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute w-full pointer-events-none"
                      style={{ top: (h - DAY_START) * HOUR_HEIGHT, borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    />
                  ))}

                  {/* Half-hour dashed lines */}
                  {HOURS.map(h => (
                    <div
                      key={`hh-${h}`}
                      className="absolute w-full pointer-events-none"
                      style={{ top: (h - DAY_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2, borderTop: '1px dashed rgba(255,255,255,0.03)' }}
                    />
                  ))}

                  {/* Current-time red bar */}
                  {isToday && nowTop !== null && (
                    <div
                      className="absolute w-full z-10 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
                      <div className="w-full" style={{ borderTop: '2px solid rgba(239,68,68,0.6)' }} />
                    </div>
                  )}

                  {/* Appointment blocks */}
                  {dayAppts.map(appt => {
                    if (!appt.scheduledAt) return null
                    const top    = apptTopPx(appt.scheduledAt)
                    const height = Math.max((appt.durationMinutes ?? 60) * (HOUR_HEIGHT / 60), 22)
                    const colors = SVC[appt.serviceColor] ?? SVC.blue
                    if (top + height < 0 || top > TOTAL_PX) return null
                    return (
                      <div
                        key={appt.id}
                        onClick={e => { e.stopPropagation(); onSelectAppointment(appt.id) }}
                        className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-10 border-l-[3px] opacity-90 hover:opacity-100 transition-opacity ${colors.bg} ${colors.text} ${colors.border}`}
                        style={{ top, height: Math.max(height, 22) }}
                        title={`${appt.customerName} — ${appt.service} @ ${appt.scheduledTime}`}
                      >
                        <p className="text-[10px] font-bold leading-tight truncate">{appt.customerName}</p>
                        {height > 32 && (
                          <p className="text-[9px] opacity-80 leading-tight truncate">{appt.service}</p>
                        )}
                        {height > 48 && (
                          <p className="text-[9px] opacity-70 leading-tight">{appt.scheduledTime}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
