'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, CalendarDays, CalendarRange, Eye } from 'lucide-react'
import { Appointment, Toast, SMSMessage } from '@/types'
import { Header } from '@/components/Header'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { SMSDrawer } from '@/components/SMSDrawer'
import { ToastContainer } from '@/components/ToastContainer'
import { AddClientModal } from '@/components/AddClientModal'
import { RescheduleModal } from '@/components/RescheduleModal'
import { WaitlistRecommendationModal } from '@/components/WaitlistRecommendationModal'
import { CalendarView } from '@/components/CalendarView'
import { WeekView } from '@/components/WeekView'
import { TechnicianPanel } from '@/components/TechnicianPanel'
import { useAppointments } from '@/hooks/useAppointments'
import { useTechnicians } from '@/hooks/useTechnicians'
import { useOrg } from '@/context/OrgContext'
import { formatDisplayDate, buildScheduledAt } from '@/lib/dateUtils'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'

export default function Dashboard() {
  const router = useRouter()
  const { org } = useOrg()

  // Read view_as from URL synchronously on first client render (lazy init)
  const [viewAs] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('view_as')
  })
  const [viewAsOrgName, setViewAsOrgName] = useState<string | null>(null)

  // Fetch the org name for the admin banner
  useEffect(() => {
    if (!viewAs) return
    fetch(`/api/admin/orgs/${viewAs}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.org) {
          setViewAsOrgName(data.org.business_name ?? data.org.name ?? viewAs)
        }
      })
      .catch(() => setViewAsOrgName(viewAs))
  }, [viewAs])

  const { appointments, setAppointments, loading, updateAppointment, logMessages, refetch: refetchAppointments } = useAppointments(viewAs)
  const { technicians, refetch: refetchTechnicians } = useTechnicians()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [canceledApptForWaitlist, setCanceledApptForWaitlist] = useState<Appointment | null>(null)
  const [view, setView] = useState<'board' | 'week' | 'calendar'>('board')
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    // Use local date, not UTC, so it always matches wall-clock "today"
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  const [addClientDefaults, setAddClientDefaults] = useState<{
    time?: string; technicianId?: string; date?: string;
    name?: string; phone?: string; address?: string;
  }>({})
  const [teamPanelOpen, setTeamPanelOpen] = useState(false)

  // All booked time slots as "Date-Time" keys, used to prevent double-booking
  const existingTimes = appointments
    .filter(a => a.status !== 'cancelled')
    .map(a => `${a.scheduledDate}-${a.scheduledTime}`)

  const selectedAppointment = appointments.find((a) => a.id === selectedId) ?? null

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000)
  }, [])

  const handleUpdateAppointment = useCallback(
    (id: string, updates: Partial<Appointment>) => {
      // updateAppointment handles the optimistic state update internally
      updateAppointment(id, updates as Record<string, unknown>)
    },
    [updateAppointment]
  )

  const handleSendReminder = useCallback(
    async (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      // Optimistic update for instant feedback
      setAppointments(prev => prev.map(a => a.id !== id ? a : { ...a, status: 'reminder_sent' }))

      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: id, type: 'reminder' }),
      })

      if (res.ok) {
        addToast({ type: 'info', message: `Reminder sent to ${appt.customerName}` })
        // Refetch to get the real SMS thread from the DB
        refetchAppointments()
      } else {
        const errData = await res.json().catch(() => ({}))
        addToast({ type: 'error', message: (errData as { error?: string }).error ?? 'Failed to send reminder' })
        // Revert optimistic update
        setAppointments(prev => prev.map(a => a.id !== id ? a : { ...a, status: appt.status }))
      }
    },
    [appointments, setAppointments, addToast, refetchAppointments]
  )

  const handleMarkComplete = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      if (appt.status === 'completed' && !appt.reviewRequestSent) {
        const reviewText = `Thanks for choosing us, ${appt.customerName.split(' ')[0]}! If ${appt.technician} took good care of you today, could you spare 30 seconds to leave a Google review? It means the world to us! ⭐`
        const newMsg: SMSMessage = {
          id: Date.now().toString(),
          from: 'system',
          text: reviewText,
          timestamp: '2 hours after completion',
          type: 'review_request',
        }
        handleUpdateAppointment(id, {
          reviewRequestSent: true,
          smsThread: [...appt.smsThread, newMsg],
        })
        logMessages(id, [{ direction: 'outbound', body: reviewText, messageType: 'review_request' }])
        addToast({
          type: 'success',
          message: `Review request sent to ${appt.customerName}.`,
        })
        return
      }

      handleUpdateAppointment(id, { status: 'completed' })

      addToast({
        type: 'success',
        message: `Job marked complete. Review request queued for 2 hours.`,
        action: {
          label: 'Send review request now →',
          onClick: () => {
            const reviewText = `Thanks for choosing us, ${appt.customerName.split(' ')[0]}! If ${appt.technician} took good care of you today, could you spare 30 seconds to leave a Google review? It means a lot to us.`
            const newMsg: SMSMessage = {
              id: Date.now().toString(),
              from: 'system',
              text: reviewText,
              timestamp: '2 hours after completion',
              type: 'review_request',
            }
            handleUpdateAppointment(id, {
              reviewRequestSent: true,
              smsThread: [...appt.smsThread, newMsg],
            })
            logMessages(id, [{ direction: 'outbound', body: reviewText, messageType: 'review_request' }])
            setSelectedId(id)
            addToast({
              type: 'success',
              message: `Review request sent to ${appt.customerName}.`,
            })
          },
        },
      })
    },
    [appointments, handleUpdateAppointment, addToast, logMessages]
  )

  const handleCancel = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      handleUpdateAppointment(id, { status: 'cancelled' })
      addToast({ type: 'info', message: 'Appointment cancelled.' })
      
      // Trigger waitlist recommendation
      setCanceledApptForWaitlist(appt)
    },
    [appointments, handleUpdateAppointment, addToast]
  )

  const handleAddClient = useCallback(
    async (appt: Appointment) => {
      // AddClientModal pre-computes scheduledAt; fall back to parsing for legacy callers
      let scheduledAtISO = appt.scheduledAt
      if (!scheduledAtISO) {
        const now = new Date()
        const baseDate = appt.scheduledDate === 'Tomorrow'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const [timePart, meridiem] = appt.scheduledTime.split(' ')
        const [hourStr, minuteStr] = timePart.split(':')
        let hour = parseInt(hourStr)
        if (meridiem === 'PM' && hour !== 12) hour += 12
        if (meridiem === 'AM' && hour === 12) hour = 0
        baseDate.setHours(hour, parseInt(minuteStr ?? '0'), 0, 0)
        scheduledAtISO = baseDate.toISOString()
      }

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          address: appt.address,
          service: appt.service,
          serviceIcon: appt.serviceIcon,
          serviceColor: appt.serviceColor,
          technicianId: appt.technicianId,
          technicianName: appt.technician,
          scheduledAt: scheduledAtISO,
          prepChecklist: appt.prepChecklist,
          durationMinutes: appt.durationMinutes,
          recurrenceRule: appt.recurrenceRule,
          recurrenceEndDate: appt.recurrenceEndDate,
          autoReminder: appt.autoReminder,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        const recurringCount: number = json.recurringCount ?? 0
        if (recurringCount > 1) {
          // Recurring: refetch all appointments so we get every occurrence
          await refetchAppointments()
          addToast({ type: 'success', message: `${recurringCount} appointments added for ${appt.customerName}.` })
        } else {
          // Single appointment: optimistic add with real DB id
          setAppointments(prev => [...prev, { ...appt, id: json.appointment.id }])
          addToast({ type: 'success', message: `${appt.customerName} added to the schedule.` })
        }
      } else {
        // Fallback: show with temp id, will sync on next fetch
        setAppointments(prev => [...prev, appt])
        addToast({ type: 'success', message: `${appt.customerName} added to the schedule.` })
      }

      setAddClientOpen(false)
      setAddClientDefaults({})
    },
    [addToast, setAppointments, refetchAppointments]
  )

  // Called from CalendarView (4-arg) — technician pre-fill
  const handleAddAtSlot = useCallback(
    (technicianId: string, _technicianName: string, time: string, date: string) => {
      setAddClientDefaults({ technicianId, time, date })
      setAddClientOpen(true)
    },
    []
  )

  // Called from WeekView (2-arg) — no technician pre-fill
  const handleAddAtSlotFromWeek = useCallback(
    (isoDate: string, time: string) => {
      setAddClientDefaults({ time, date: isoDate })
      setAddClientOpen(true)
    },
    []
  )

  const handleOpenReschedule = useCallback(
    (id: string) => {
      const appt = appointments.find(a => a.id === id)
      if (appt) setRescheduleTarget(appt)
    },
    [appointments]
  )

  const handleAssignTechnician = useCallback(
    (id: string, technicianId: string, technicianName: string) => {
      handleUpdateAppointment(id, { technicianId, technician: technicianName })
      addToast({ type: 'success', message: `${technicianName} assigned to job.` })
    },
    [handleUpdateAppointment, addToast]
  )

  // Updated: accepts ISO date string instead of 'Today'|'Tomorrow'
  const handleScheduleFollowUp = useCallback(
    (appt: Appointment) => {
      setAddClientDefaults({
        name: appt.customerName,
        phone: appt.customerPhone,
        address: appt.address,
      })
      setAddClientOpen(true)
    },
    []
  )

  const handleReschedule = useCallback(
    (id: string, newDateISO: string, newTime: string) => {
      const appt = appointments.find(a => a.id === id)
      if (!appt) return
      const newScheduledDate = formatDisplayDate(newDateISO)
      const newScheduledAt   = buildScheduledAt(newDateISO, newTime)
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const confirmMsg: SMSMessage = {
        id: Date.now().toString(),
        from: 'system',
        text: `Hi ${appt.customerName.split(' ')[0]}! Your appointment has been rescheduled to ${
          newScheduledDate === 'Today' ? 'today' : newScheduledDate === 'Tomorrow' ? 'tomorrow' : newScheduledDate
        } at ${newTime} with ${appt.technician}. Reply '1' to confirm.`,
        timestamp: now,
        type: 'reminder',
      }
      handleUpdateAppointment(id, {
        scheduledDate: newScheduledDate,
        scheduledTime: newTime,
        scheduledAt: newScheduledAt,
        status: 'reminder_sent',
        smsThread: [...appt.smsThread, confirmMsg],
      })
      logMessages(id, [{ direction: 'outbound', body: confirmMsg.text, messageType: 'reminder' }])
      setRescheduleTarget(null)
      addToast({ type: 'success', message: `${appt.customerName} rescheduled to ${newScheduledDate} at ${newTime}.` })
    },
    [appointments, handleUpdateAppointment, addToast, logMessages]
  )

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0f1115',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Admin impersonation banner */}
      {viewAs && (
        <div
          className="flex items-center justify-between px-5 py-2.5 text-sm font-semibold"
          style={{ background: 'linear-gradient(90deg, #92400e, #78350f)', borderBottom: '1px solid #b45309', color: '#fef3c7' }}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Admin view: <span className="text-amber-300">{viewAsOrgName ?? '…'}</span></span>
            <span className="text-amber-600/70 text-xs font-normal">— read-only impersonation</span>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-200 transition-colors px-2 py-1 rounded"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            ← Exit to admin
          </button>
        </div>
      )}

      <Header onAddClient={() => setAddClientOpen(true)} onManageTeam={() => setTeamPanelOpen(true)} />
      <StatsBar appointments={appointments} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* View toggle */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="flex items-center gap-0.5 rounded-xl p-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {([
              { id: 'board',    label: 'Board',    Icon: LayoutGrid },
              { id: 'week',     label: 'Week',     Icon: CalendarRange },
              { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
                style={
                  view === id
                    ? {
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.15))',
                        color: '#e65c00',
                        boxShadow: '0 2px 8px rgba(249,115,22,0.15)',
                      }
                    : { color: '#3a3a48' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === 'board' ? (
          <KanbanBoard
            appointments={appointments}
            technicians={technicians}
            onSelectAppointment={setSelectedId}
            onSendReminder={handleSendReminder}
            onMarkComplete={handleMarkComplete}
            onCancel={handleCancel}
            onReschedule={handleOpenReschedule}
            onScheduleFollowUp={handleScheduleFollowUp}
            onAssignTechnician={handleAssignTechnician}
            readOnly={org?.userRole === 'viewer' || org?.userRole === 'technician'}
          />
        ) : view === 'week' ? (
          <WeekView
            appointments={appointments}
            onSelectAppointment={setSelectedId}
            onAddAtSlot={handleAddAtSlotFromWeek}
            readOnly={org?.userRole === 'viewer' || org?.userRole === 'technician'}
          />
        ) : (
          <CalendarView
            appointments={appointments}
            technicians={technicians}
            calendarDate={calendarDate}
            onCalendarDateChange={setCalendarDate}
            onSelectAppointment={setSelectedId}
            onAddAtSlot={handleAddAtSlot}
            readOnly={org?.userRole === 'viewer' || org?.userRole === 'technician'}
          />
        )}
      </main>

      {selectedAppointment && (
        <SMSDrawer
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onMarkComplete={handleMarkComplete}
          onScheduleFollowUp={handleScheduleFollowUp}
          readOnly={org?.userRole === 'viewer' || org?.userRole === 'technician'}
        />
      )}

      {addClientOpen && (
        <AddClientModal
          onAdd={handleAddClient}
          onClose={() => { setAddClientOpen(false); setAddClientDefaults({}) }}
          technicians={technicians}
          existingTimes={existingTimes}
          defaultTime={addClientDefaults.time}
          defaultTechnicianId={addClientDefaults.technicianId}
          defaultDate={addClientDefaults.date}
          defaultName={addClientDefaults.name}
          defaultPhone={addClientDefaults.phone}
          defaultAddress={addClientDefaults.address}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          existingTimes={existingTimes}
          onReschedule={handleReschedule}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      {canceledApptForWaitlist && (
        <WaitlistRecommendationModal
          canceledAppointment={canceledApptForWaitlist}
          onClose={() => setCanceledApptForWaitlist(null)}
          onBookWaitlist={(entry) => {
            setAddClientDefaults({
              date: canceledApptForWaitlist.scheduledDate === 'Today' 
                ? new Date().toISOString().split('T')[0]
                : canceledApptForWaitlist.scheduledDate === 'Tomorrow'
                ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                : canceledApptForWaitlist.scheduledDate,
              time: canceledApptForWaitlist.scheduledTime,
              technicianId: canceledApptForWaitlist.technicianId,
              name: entry.customer_name,
              phone: entry.customer_phone,
              address: entry.customer_address,
            })
            setAddClientOpen(true)
            setCanceledApptForWaitlist(null)
          }}
        />
      )}

      {teamPanelOpen && (
        <TechnicianPanel onClose={() => { setTeamPanelOpen(false); refetchTechnicians() }} />
      )}

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  )
}
