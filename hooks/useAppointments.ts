'use client'

import { useState, useEffect, useCallback } from 'react'
import { Appointment } from '@/types'
import { formatDisplayDate } from '@/lib/dateUtils'
import { createClient } from '@/lib/supabase/client'

/**
 * Converts a DB appointment row (snake_case, timestamptz) to the
 * frontend Appointment shape (camelCase, scheduledDate/scheduledTime strings).
 */
function mapDbAppointment(row: Record<string, unknown>): Appointment {
  const scheduledAt = new Date(row.scheduled_at as string)

  const apptDay = new Date(scheduledAt)
  apptDay.setHours(0, 0, 0, 0)

  // Build ISO date from local time to match formatDisplayDate
  const y = apptDay.getFullYear()
  const m = String(apptDay.getMonth() + 1).padStart(2, '0')
  const d = String(apptDay.getDate()).padStart(2, '0')
  const isoDate = `${y}-${m}-${d}`
  const scheduledDate = formatDisplayDate(isoDate)

  const scheduledTime = scheduledAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const client = row.clients as Record<string, unknown> | null
  const tech = row.technicians as Record<string, unknown> | null
  const smsRows = (row.sms_messages as Record<string, unknown>[] | null) ?? []

  return {
    id: row.id as string,
    customerName: (client?.name ?? 'Unknown') as string,
    customerPhone: (client?.phone ?? '') as string,
    service: row.service as string,
    serviceIcon: (row.service_icon ?? '') as string,
    serviceColor: (row.service_color ?? '') as string,
    scheduledTime,
    scheduledDate,
    scheduledAt: row.scheduled_at as string,  // keep full ISO for WeekView positioning
    technician: (tech?.name ?? 'Unassigned') as string,
    technicianId: (tech?.id as string) ?? undefined,
    address: (row.address ?? '') as string,
    status: row.status as Appointment['status'],
    prepChecklist: (row.prep_checklist as string[]) ?? [],
    smsThread: smsRows.map(m => ({
      id: m.id as string,
      from: m.direction === 'inbound' ? 'customer' : 'system',
      text: m.body as string,
      timestamp: new Date(m.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: m.message_type as Appointment['smsThread'][number]['type'],
    })),
    reviewRequestSent: (row.review_request_sent as boolean) ?? false,
    notes: row.notes as string | undefined,
    // Scheduling v2
    durationMinutes: (row.duration_minutes as number) ?? 60,
    recurrenceRule: ((row.recurrence_rule as string) ?? 'none') as Appointment['recurrenceRule'],
    recurrenceEndDate: (row.recurrence_end_date as string) ?? undefined,
    parentAppointmentId: (row.parent_appointment_id as string) ?? undefined,
    autoReminder: (row.auto_reminder as boolean) ?? true,
    priceCents: typeof row.price_cents === 'number' ? row.price_cents : null,
  }
}

export type SmsLogEntry = {
  direction: 'inbound' | 'outbound'
  body: string
  messageType: 'reminder' | 'confirmation' | 'customer_reply' | 'reschedule_link' | 'review_request' | 'general'
}

export function useAppointments(viewAs?: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      const url = viewAs ? `/api/appointments?view_as=${viewAs}` : '/api/appointments'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load appointments')
      const json = await res.json()
      setAppointments((json.appointments as Record<string, unknown>[]).map(mapDbAppointment))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [viewAs])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Real-time: refetch when appointments are inserted (booking portal) or updated (status changes)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAppointments])

  // Polling fallback: re-sync every 30 seconds in case Realtime misses an event
  useEffect(() => {
    const id = setInterval(() => { fetchAppointments() }, 30_000)
    return () => clearInterval(id)
  }, [fetchAppointments])

  const updateAppointment = useCallback(async (id: string, updates: Record<string, unknown>) => {
    // Optimistic update — convert camelCase back to the API shape
    setAppointments(prev => prev.map(a => {
      if (a.id !== id) return a
      return { ...a, ...updates } as Appointment
    }))

    // Map camelCase updates to API snake_case
    const apiUpdates: Record<string, unknown> = {}
    if ('status' in updates) apiUpdates.status = updates.status
    if ('scheduledAt' in updates) apiUpdates.scheduledAt = updates.scheduledAt
    if ('notes' in updates) apiUpdates.notes = updates.notes
    if ('prepChecklist' in updates) apiUpdates.prepChecklist = updates.prepChecklist
    if ('reviewRequestSent' in updates) apiUpdates.reviewRequestSent = updates.reviewRequestSent
    if ('technicianId' in updates) apiUpdates.technicianId = updates.technicianId
    if ('durationMinutes' in updates) apiUpdates.durationMinutes = updates.durationMinutes
    if ('autoReminder' in updates) apiUpdates.autoReminder = updates.autoReminder

    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiUpdates),
    })

    if (res.ok) {
      // Reconcile status from DB response to catch any server-side status changes
      const json = await res.json().catch(() => null)
      if (json?.appointment?.status) {
        setAppointments(prev => prev.map(a =>
          a.id !== id ? a : { ...a, status: json.appointment.status }
        ))
      }
    } else {
      // Log error details to console for debugging
      const errText = await res.text().catch(() => '(unreadable)')
      console.error('[PATCH /api/appointments] failed', res.status, errText)
      // Revert optimistic update on failure
      fetchAppointments()
    }
  }, [fetchAppointments])

  const addAppointment = useCallback((appt: Appointment) => {
    setAppointments(prev => [...prev, appt])
  }, [])

  /**
   * Persists one or more SMS messages to the sms_messages table without
   * invoking ClickSend. Used for simulated replies and local reminder logging.
   * Fires-and-forgets — UI is already updated optimistically.
   */
  const logMessages = useCallback(async (appointmentId: string, messages: SmsLogEntry[]) => {
    await Promise.all(
      messages.map(m =>
        fetch('/api/sms/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId,
            direction: m.direction,
            body: m.body,
            messageType: m.messageType,
          }),
        })
      )
    )
  }, [])

  return { appointments, setAppointments, loading, error, updateAppointment, addAppointment, logMessages, refetch: fetchAppointments }
}
