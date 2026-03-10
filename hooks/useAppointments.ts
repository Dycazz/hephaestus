'use client'

import { useState, useEffect, useCallback } from 'react'
import { Appointment } from '@/types'

/**
 * Converts a DB appointment row (snake_case, timestamptz) to the
 * frontend Appointment shape (camelCase, scheduledDate/scheduledTime strings).
 */
function mapDbAppointment(row: Record<string, unknown>): Appointment {
  const scheduledAt = new Date(row.scheduled_at as string)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const apptDay = new Date(scheduledAt)
  apptDay.setHours(0, 0, 0, 0)

  let scheduledDate: string
  if (apptDay.getTime() === today.getTime()) {
    scheduledDate = 'Today'
  } else if (apptDay.getTime() === tomorrow.getTime()) {
    scheduledDate = 'Tomorrow'
  } else {
    scheduledDate = scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
    technician: (tech?.name ?? 'Unassigned') as string,
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
  }
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments')
      if (!res.ok) throw new Error('Failed to load appointments')
      const json = await res.json()
      setAppointments((json.appointments as Record<string, unknown>[]).map(mapDbAppointment))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const updateAppointment = useCallback(async (id: string, updates: Record<string, unknown>) => {
    // Optimistic update — convert camelCase back to the API shape
    setAppointments(prev => prev.map(a => {
      if (a.id !== id) return a
      // Apply frontend-shape updates directly for instant UI
      return { ...a, ...updates } as Appointment
    }))

    // Map camelCase updates to API snake_case
    const apiUpdates: Record<string, unknown> = {}
    if ('status' in updates) apiUpdates.status = updates.status
    if ('scheduledDate' in updates || 'scheduledTime' in updates) {
      // Full reschedule — caller should pass scheduledAt ISO string directly
    }
    if ('scheduledAt' in updates) apiUpdates.scheduledAt = updates.scheduledAt
    if ('notes' in updates) apiUpdates.notes = updates.notes
    if ('prepChecklist' in updates) apiUpdates.prepChecklist = updates.prepChecklist
    if ('reviewRequestSent' in updates) apiUpdates.reviewRequestSent = updates.reviewRequestSent

    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiUpdates),
    })

    if (!res.ok) {
      // Revert optimistic update on failure
      fetchAppointments()
    }
  }, [fetchAppointments])

  const addAppointment = useCallback((appt: Appointment) => {
    setAppointments(prev => [...prev, appt])
  }, [])

  return { appointments, setAppointments, loading, error, updateAppointment, addAppointment, refetch: fetchAppointments }
}
