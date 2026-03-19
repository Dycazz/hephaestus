'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TechnicianAvailability } from '@/types'
import { toISODate } from '@/lib/dateUtils'

// ─── Time slots (6:00 AM – 9:00 PM, 30-min increments) ───────────────────────
function buildTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) break
      const period = h < 12 ? 'AM' : 'PM'
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      slots.push(`${h12}:${String(m).padStart(2, '0')} ${period}`)
    }
  }
  return slots
}

export const TIME_SLOTS = buildTimeSlots()

// ─── Utility helpers ──────────────────────────────────────────────────────────
/** "9:00 AM" → minutes since midnight */
function to24Min(timeStr: string): number {
  const [timePart, period] = timeStr.split(' ')
  const [hStr, mStr] = timePart.split(':')
  let h = parseInt(hStr)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + parseInt(mStr ?? '0')
}

/** "08:00" (24-hr HH:MM) → minutes since midnight */
function hhmm(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

function getFirstDayOfWeek(y: number, m: number): number {
  return new Date(y, m, 1).getDay() // 0 = Sunday
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface DateTimePickerProps {
  date: string | null                        // ISO "YYYY-MM-DD"
  time: string | null                        // "9:00 AM" 12-hr
  onDateChange: (d: string) => void
  onTimeChange: (t: string) => void
  bookedTimes?: string[]                     // already-booked times on `date` e.g. ["9:00 AM"]
  technicianAvailability?: TechnicianAvailability[]
  minDate?: string                           // ISO, defaults to today
  dateOnly?: boolean                         // hide time panel (for recurrence end-date)
  accentColor?: 'blue' | 'purple' | 'orange'
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  bookedTimes = [],
  technicianAvailability,
  minDate,
  dateOnly = false,
  accentColor = 'blue',
}: DateTimePickerProps) {
  const today = toISODate(new Date())
  const effectiveMin = minDate ?? today
  const isBlue = accentColor === 'blue'

  const [viewYear, setViewYear] = useState(() =>
    date ? parseInt(date.split('-')[0]) : new Date().getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(() =>
    date ? parseInt(date.split('-')[1]) - 1 : new Date().getMonth()
  )

  // ── Month navigation ────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Calendar cells ──────────────────────────────────────────────────────────
  const calCells = useMemo(() => {
    const total = getDaysInMonth(viewYear, viewMonth)
    const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
    const cells: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  const isoForDay = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const dayCellClass = (day: number) => {
    const iso = isoForDay(day)
    const isPast = iso < effectiveMin
    const isSel  = iso === date
    const isTod  = iso === today
    if (isPast) return 'text-text-muted/30 cursor-not-allowed'
    if (isSel)  return 'bg-accent text-white font-bold rounded-lg shadow-[0_0_12px_rgba(217,119,6,0.3)]'
    if (isTod)  return 'ring-1 ring-accent/50 rounded-lg font-semibold text-accent cursor-pointer hover:bg-accent/10'
    return 'text-text-secondary cursor-pointer hover:bg-[rgba(44,52,64,0.15)] hover:text-text-primary rounded-lg transition-colors'
  }

  const handleDayClick = (day: number) => {
    const iso = isoForDay(day)
    if (iso < effectiveMin) return
    onDateChange(iso)
  }

  // ── Availability check ─────────────────────────────────────────────────────
  const dayOfWeek = useMemo(() => {
    if (!date) return null
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d).getDay()
  }, [date])

  const isSlotOutsideHours = (slot: string): boolean => {
    if (!technicianAvailability || dayOfWeek === null) return false
    const dow = dayOfWeek
    const avail = technicianAvailability.find(a => a.dayOfWeek === dow)
    if (!avail) {
      // Default: Mon-Fri 08-17, Sat/Sun off
      if (dow === 0 || dow === 6) return true
      const m = to24Min(slot)
      return m < 8 * 60 || m >= 17 * 60
    }
    if (!avail.isWorking) return true
    const m = to24Min(slot)
    return m < hhmm(avail.startTime) || m >= hhmm(avail.endTime)
  }

  // Detect if the entire selected day is a day-off (for label purposes)
  const isDayOff = dayOfWeek !== null && isSlotOutsideHours('12:00 PM')

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* ── Calendar panel ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        {/* Month / year header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[rgba(44,52,64,0.15)] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-text-primary tracking-tight">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[rgba(44,52,64,0.15)] transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="flex items-center justify-center w-9 text-[10px] uppercase font-bold text-text-muted/60 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calCells.map((day, i) => (
            <div key={i} className="flex items-center justify-center">
              {day !== null ? (
                <button
                  onClick={() => handleDayClick(day)}
                  disabled={isoForDay(day) < effectiveMin}
                  className={`w-9 h-9 text-xs flex items-center justify-center transition-all ${dayCellClass(day)}`}
                >
                  {day}
                </button>
              ) : (
                <div className="w-9 h-9" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Time panel ──────────────────────────────────────────────────────── */}
      {!dateOnly && (
        <div className="flex-1 min-w-0">
          {!date ? (
            <div className="flex items-center justify-center h-full min-h-[128px] border border-dashed border-[rgba(44,52,64,0.3)] bg-[rgba(44,52,64,0.05)] rounded-xl text-text-muted text-xs text-center p-4">
              ← Pick a date to<br />see available times
            </div>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-2 flex items-center gap-1">
                Available Times
                {isDayOff && (
                  <span className="text-[9px] text-orange-400 font-bold bg-orange-400/10 border border-orange-400/20 rounded px-1.5 py-0.5 ml-1 uppercase">
                    Day off
                  </span>
                )}
              </p>
              <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto pr-0.5">
                {TIME_SLOTS.map(slot => {
                  const booked  = bookedTimes.includes(slot)
                  const outside = isSlotOutsideHours(slot)
                  const selected = slot === time
                  return (
                    <button
                      key={slot}
                      onClick={() => !booked && onTimeChange(slot)}
                      disabled={booked}
                      title={booked ? 'Already booked' : outside ? 'Outside working hours' : undefined}
                      className={`py-2 px-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        booked
                          ? 'bg-[rgba(44,52,64,0.05)] text-text-muted/40 border-[rgba(44,52,64,0.1)] cursor-not-allowed'
                          : selected
                          ? 'bg-accent text-white border-accent shadow-[0_0_10px_rgba(217,119,6,0.2)]'
                          : outside
                          ? 'text-text-muted border-[rgba(44,52,64,0.2)] cursor-pointer hover:border-[rgba(44,52,64,0.3)] hover:bg-[rgba(44,52,64,0.05)]'
                          : 'bg-[rgba(44,52,64,0.1)] text-text-secondary border-[rgba(44,52,64,0.3)] hover:border-accent/40 hover:bg-accent/5 hover:text-text-primary'
                      }`}
                      style={outside && !booked && !selected ? {
                        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(44,52,64,0.1) 3px, rgba(44,52,64,0.1) 6px)',
                      } : undefined}
                    >
                      {slot}
                      {booked && <span className="block text-[8px] leading-none mt-0.5 opacity-50">Booked</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
