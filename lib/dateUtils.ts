/**
 * Shared date/time helpers used across scheduling components and API handlers.
 * All functions operate in LOCAL time (browser wall-clock), matching user intent.
 */

/** Format a JS Date as "YYYY-MM-DD" in local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return today's ISO date string (local time). */
export function todayISO(): string {
  return toISODate(new Date())
}

/**
 * Convert an ISO date "YYYY-MM-DD" to a human-readable display label.
 * Returns "Today", "Tomorrow", or "Mar 15".
 */
export function formatDisplayDate(iso: string): string {
  const today = toISODate(new Date())
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toISODate(tomorrowDate)
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Convert an ISO date "YYYY-MM-DD" to a full label with day-of-week.
 * e.g. "Wed, Mar 15"
 */
export function formatWeekDayDate(iso: string): { weekday: string; date: string } {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

/**
 * Build a full ISO datetime string from an ISO date + a 12-hour time string.
 * e.g. buildScheduledAt("2026-04-15", "9:30 AM") → "2026-04-15T09:30:00.000Z"-ish
 * (uses local timezone via `new Date(...)`)
 */
export function buildScheduledAt(dateISO: string, timeStr: string): string {
  const [year, month, day] = dateISO.split('-').map(Number)
  const [timePart, meridiem] = timeStr.split(' ')
  const [hourStr, minuteStr] = timePart.split(':')
  let hour = parseInt(hourStr)
  if (meridiem === 'PM' && hour !== 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return new Date(year, month - 1, day, hour, parseInt(minuteStr ?? '0'), 0).toISOString()
}

/**
 * Deterministically format local time as a DateTimePicker time-slot string.
 * Must match the slot format produced by `DateTimePicker` / `TIME_SLOTS`.
 * Example: 09:00 → "9:00 AM", 00:30 → "12:30 AM"
 */
export function formatTimeSlotFromDate(d: Date): string {
  const h24 = d.getHours()
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const minutes = d.getMinutes()
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Get the Monday of the ISO week containing `date`.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Add `days` days to `date`, returning a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
