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
  accentColor?: 'blue' | 'purple'
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
    if (isPast) return 'text-slate-300 cursor-not-allowed'
    if (isSel)  return isBlue ? 'bg-blue-600 text-white font-bold rounded-full' : 'bg-purple-600 text-white font-bold rounded-full'
    if (isTod)  return isBlue
      ? 'ring-2 ring-blue-400 rounded-full font-semibold text-blue-700 cursor-pointer hover:bg-blue-50'
      : 'ring-2 ring-purple-400 rounded-full font-semibold text-purple-700 cursor-pointer hover:bg-purple-50'
    return 'text-slate-700 cursor-pointer hover:bg-slate-100 rounded-full'
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
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="flex items-center justify-center w-9 text-[11px] font-semibold text-slate-400 py-0.5">
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
            <div className="flex items-center justify-center h-full min-h-[128px] border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs text-center p-4">
              ← Pick a date to<br />see available times
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                Available Times
                {isDayOff && (
                  <span className="text-[10px] text-amber-600 font-normal bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 ml-1">
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
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        booked
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : selected
                          ? isBlue
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-purple-600 text-white border-purple-600'
                          : outside
                          ? 'text-slate-400 border-slate-200 cursor-pointer hover:border-slate-300'
                          : isBlue
                          ? 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                      style={outside && !booked && !selected ? {
                        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 6px)',
                      } : undefined}
                    >
                      {slot}
                      {booked && <span className="block text-[8px] leading-none mt-0.5 text-slate-400">Booked</span>}
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
