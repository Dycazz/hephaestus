'use client'

import { useState, useCallback } from 'react'
import { LayoutGrid, CalendarDays, Loader2 } from 'lucide-react'
import { Appointment, Toast, SMSMessage } from '@/types'
import { Header } from '@/components/Header'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { SMSDrawer } from '@/components/SMSDrawer'
import { WaitlistModal } from '@/components/WaitlistModal'
import { ToastContainer } from '@/components/ToastContainer'
import { AddClientModal } from '@/components/AddClientModal'
import { RescheduleModal } from '@/components/RescheduleModal'
import { CalendarView } from '@/components/CalendarView'
import { TechnicianPanel } from '@/components/TechnicianPanel'
import { useAppointments } from '@/hooks/useAppointments'
import { useTechnicians } from '@/hooks/useTechnicians'

export default function Dashboard() {
  const { appointments, setAppointments, loading, updateAppointment, logMessages } = useAppointments()
  const { technicians, refetch: refetchTechnicians } = useTechnicians()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const [cancelledSlot, setCancelledSlot] = useState<Appointment | null>(null)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [view, setView] = useState<'board' | 'calendar'>('board')
  const [calendarDate, setCalendarDate] = useState<string>(() => {
    // Use local date, not UTC, so it always matches wall-clock "today"
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  const [addClientDefaults, setAddClientDefaults] = useState<{
    time?: string; technicianId?: string; date?: string  // ISO date YYYY-MM-DD
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
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      )
      // Persist to DB (non-blocking, optimistic)
      updateAppointment(id, updates as Record<string, unknown>)
    },
    [setAppointments, updateAppointment]
  )

  const handleSendReminder = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      const dateWord = appt.scheduledDate === 'Today' ? 'today' : appt.scheduledDate === 'Tomorrow' ? 'tomorrow' : `on ${appt.scheduledDate}`
      const prep = appt.prepChecklist[0] ? ` Please: ${appt.prepChecklist[0]}.` : ''
      const reminderText = `Hi ${appt.customerName.split(' ')[0]}! This is ${appt.technician.split(' ')[0]} confirming your ${appt.service} appointment ${dateWord} at ${appt.scheduledTime}.${prep} Reply '1' to confirm or '2' to reschedule.`

      const newMsg: SMSMessage = {
        id: Date.now().toString(),
        from: 'system',
        text: reminderText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'reminder',
      }

      handleUpdateAppointment(id, {
        status: 'reminder_sent',
        smsThread: [...appt.smsThread, newMsg],
      })
      logMessages(id, [{ direction: 'outbound', body: reminderText, messageType: 'reminder' }])

      addToast({ type: 'info', message: `Reminder sent to ${appt.customerName}` })
    },
    [appointments, handleUpdateAppointment, addToast, logMessages]
  )

  const handleSimulateReply = useCallback(
    (id: string, reply: '1' | '2') => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (reply === '1') {
        const newMsgs: SMSMessage[] = [
          {
            id: Date.now().toString(),
            from: 'customer',
            text: '1',
            timestamp: now,
            type: 'customer_reply',
          },
          {
            id: (Date.now() + 1).toString(),
            from: 'system',
            text: `Perfect, you're all confirmed for ${appt.scheduledDate === 'Today' ? 'today' : appt.scheduledDate === 'Tomorrow' ? 'tomorrow' : appt.scheduledDate} at ${appt.scheduledTime}! ${appt.technician} will see you then. 🔧`,
            timestamp: now,
            type: 'confirmation',
          },
        ]
        handleUpdateAppointment(id, {
          status: 'confirmed',
          smsThread: [...appt.smsThread, ...newMsgs],
        })
        logMessages(id, [
          { direction: 'inbound', body: '1', messageType: 'customer_reply' },
          { direction: 'outbound', body: newMsgs[1].text, messageType: 'confirmation' },
        ])
        addToast({
          type: 'success',
          message: `${appt.customerName} confirmed the appointment.`,
        })
        setSelectedId(null)
      } else {
        const newMsgs: SMSMessage[] = [
          {
            id: Date.now().toString(),
            from: 'customer',
            text: '2',
            timestamp: now,
            type: 'customer_reply',
          },
          {
            id: (Date.now() + 1).toString(),
            from: 'system',
            text: `No problem! Here's your rescheduling link — pick any open slot: mikesplumbing.com/reschedule`,
            timestamp: now,
            type: 'reschedule_link',
          },
        ]
        handleUpdateAppointment(id, {
          status: 'rescheduling',
          smsThread: [...appt.smsThread, ...newMsgs],
        })
        logMessages(id, [
          { direction: 'inbound', body: '2', messageType: 'customer_reply' },
          { direction: 'outbound', body: newMsgs[1].text, messageType: 'reschedule_link' },
        ])
        addToast({
          type: 'warning',
          message: `${appt.customerName} requested a reschedule. Link sent.`,
        })
        setSelectedId(null)
      }
    },
    [appointments, handleUpdateAppointment, addToast, logMessages]
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
      setCancelledSlot(appt)
      setWaitlistOpen(true)
    },
    [appointments, handleUpdateAppointment]
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
        }),
      })

      if (res.ok) {
        const json = await res.json()
        // Use the real DB id but keep the frontend-shaped appt for instant display
        setAppointments(prev => [...prev, { ...appt, id: json.appointment.id }])
      } else {
        // Fallback: show with temp id, will sync on next fetch
        setAppointments(prev => [...prev, appt])
      }

      setAddClientOpen(false)
      setAddClientDefaults({})
      addToast({ type: 'success', message: `${appt.customerName} added to the schedule.` })
    },
    [addToast, setAppointments]
  )

  const handleAddAtSlot = useCallback(
    (technicianId: string, _technicianName: string, time: string, date: string) => {
      setAddClientDefaults({ technicianId, time, date })
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

  const handleReschedule = useCallback(
    (id: string, newDate: 'Today' | 'Tomorrow', newTime: string) => {
      const appt = appointments.find(a => a.id === id)
      if (!appt) return
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const confirmMsg: SMSMessage = {
        id: Date.now().toString(),
        from: 'system',
        text: `Hi ${appt.customerName.split(' ')[0]}! Your appointment has been rescheduled to ${newDate === 'Today' ? 'today' : 'tomorrow'} at ${newTime} with ${appt.technician}. Reply '1' to confirm the new time.`,
        timestamp: now,
        type: 'reminder',
      }
      handleUpdateAppointment(id, {
        scheduledDate: newDate,
        scheduledTime: newTime,
        status: 'reminder_sent',
        smsThread: [...appt.smsThread, confirmMsg],
      })
      logMessages(id, [{ direction: 'outbound', body: confirmMsg.text, messageType: 'reminder' }])
      setRescheduleTarget(null)
      addToast({ type: 'success', message: `${appt.customerName} rescheduled to ${newDate} at ${newTime}.` })
    },
    [appointments, handleUpdateAppointment, addToast, logMessages]
  )

  const handleNotifyWaitlist = useCallback(() => {
    if (!cancelledSlot) return
    addToast({
      type: 'success',
      message: `Waitlist notified about the ${cancelledSlot.scheduledTime} opening.`,
    })
    setWaitlistOpen(false)
    setCancelledSlot(null)
  }, [cancelledSlot, addToast])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: '#111318' }}
      >
        <Loader2 className="w-8 h-8 text-blue-500/60 animate-spin" />
        <p className="text-blue-300/40 text-sm font-medium tracking-wide">Loading your schedule…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#111318' }}>
      <Header onAddClient={() => setAddClientOpen(true)} onManageTeam={() => setTeamPanelOpen(true)} />
      <StatsBar appointments={appointments} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* View toggle */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                view === 'board'
                  ? 'text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={view === 'board' ? { background: 'linear-gradient(135deg, #1e3a6e, #1e40af)', boxShadow: '0 2px 8px rgba(30,58,110,0.5)' } : undefined}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                view === 'calendar'
                  ? 'text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={view === 'calendar' ? { background: 'linear-gradient(135deg, #1e3a6e, #1e40af)', boxShadow: '0 2px 8px rgba(30,58,110,0.5)' } : undefined}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
        </div>

        {view === 'board' ? (
          <KanbanBoard
            appointments={appointments}
            onSelectAppointment={setSelectedId}
            onSendReminder={handleSendReminder}
            onMarkComplete={handleMarkComplete}
            onCancel={handleCancel}
            onReschedule={handleOpenReschedule}
          />
        ) : (
          <CalendarView
            appointments={appointments}
            technicians={technicians}
            calendarDate={calendarDate}
            onCalendarDateChange={setCalendarDate}
            onSelectAppointment={setSelectedId}
            onAddAtSlot={handleAddAtSlot}
          />
        )}
      </main>

      {selectedAppointment && (
        <SMSDrawer
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onSimulateReply={handleSimulateReply}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {waitlistOpen && cancelledSlot && (
        <WaitlistModal
          cancelledSlot={cancelledSlot}
          onNotify={handleNotifyWaitlist}
          onDismiss={() => {
            setWaitlistOpen(false)
            setCancelledSlot(null)
          }}
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
