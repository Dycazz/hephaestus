'use client'

import { useState, useCallback } from 'react'
import { Appointment, Toast, SMSMessage } from '@/types'
import { mockAppointments } from '@/lib/mockData'
import { Header } from '@/components/Header'
import { StatsBar } from '@/components/StatsBar'
import { KanbanBoard } from '@/components/KanbanBoard'
import { SMSDrawer } from '@/components/SMSDrawer'
import { WaitlistModal } from '@/components/WaitlistModal'
import { ToastContainer } from '@/components/ToastContainer'

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const [cancelledSlot, setCancelledSlot] = useState<Appointment | null>(null)

  const selectedAppointment = appointments.find((a) => a.id === selectedId) ?? null

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000)
  }, [])

  const updateAppointment = useCallback(
    (id: string, updates: Partial<Appointment>) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      )
    },
    []
  )

  const handleSendReminder = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      const dateWord = appt.scheduledDate === 'Today' ? 'today' : 'tomorrow'
      const prep = appt.prepChecklist[0] ? ` Please: ${appt.prepChecklist[0]}.` : ''
      const reminderText = `Hi ${appt.customerName.split(' ')[0]}! This is Mike's Plumbing confirming your ${appt.service} appointment ${dateWord} at ${appt.scheduledTime} with ${appt.technician}.${prep} Reply '1' to confirm or '2' to reschedule.`

      const newMsg: SMSMessage = {
        id: Date.now().toString(),
        from: 'system',
        text: reminderText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'reminder',
      }

      updateAppointment(id, {
        status: 'reminder_sent',
        smsThread: [...appt.smsThread, newMsg],
      })

      addToast({ type: 'info', message: `📱 Reminder sent to ${appt.customerName}` })
    },
    [appointments, updateAppointment, addToast]
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
            text: `Perfect, you're all confirmed for ${appt.scheduledDate === 'Today' ? 'today' : 'tomorrow'} at ${appt.scheduledTime}! ${appt.technician} will see you then. 🔧`,
            timestamp: now,
            type: 'confirmation',
          },
        ]
        updateAppointment(id, {
          status: 'confirmed',
          smsThread: [...appt.smsThread, ...newMsgs],
        })
        addToast({
          type: 'success',
          message: `✅ ${appt.customerName} confirmed! Card moved to Ready to Roll.`,
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
        updateAppointment(id, {
          status: 'rescheduling',
          smsThread: [...appt.smsThread, ...newMsgs],
        })
        addToast({
          type: 'warning',
          message: `🔄 ${appt.customerName} wants to reschedule. Link sent — no phone tag needed!`,
        })
        setSelectedId(null)
      }
    },
    [appointments, updateAppointment, addToast]
  )

  const handleMarkComplete = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      if (appt.status === 'completed' && !appt.reviewRequestSent) {
        // Simulate the 2-hour review request
        const reviewText = `Thanks for choosing Mike's Plumbing, ${appt.customerName.split(' ')[0]}! If ${appt.technician} took good care of you today, could you spare 30 seconds to leave a Google review? It means the world to us! ⭐ mikesplumbing.com/review`
        const newMsg: SMSMessage = {
          id: Date.now().toString(),
          from: 'system',
          text: reviewText,
          timestamp: '2 hours after completion',
          type: 'review_request',
        }
        updateAppointment(id, {
          reviewRequestSent: true,
          smsThread: [...appt.smsThread, newMsg],
        })
        addToast({
          type: 'success',
          message: `⭐ Review request sent to ${appt.customerName}!`,
        })
        return
      }

      updateAppointment(id, { status: 'completed' })

      addToast({
        type: 'success',
        message: `🎉 Job complete! Google review request queued for 2 hours.`,
        action: {
          label: 'Preview review request →',
          onClick: () => {
            const reviewText = `Thanks for choosing Mike's Plumbing, ${appt.customerName.split(' ')[0]}! If ${appt.technician} took good care of you today, could you spare 30 seconds to leave a Google review? It means the world to us! ⭐ mikesplumbing.com/review`
            const newMsg: SMSMessage = {
              id: Date.now().toString(),
              from: 'system',
              text: reviewText,
              timestamp: '2 hours after completion',
              type: 'review_request',
            }
            updateAppointment(id, {
              reviewRequestSent: true,
              smsThread: [...appt.smsThread, newMsg],
            })
            setSelectedId(id)
            addToast({
              type: 'success',
              message: `⭐ Review request sent to ${appt.customerName}!`,
            })
          },
        },
      })
    },
    [appointments, updateAppointment, addToast]
  )

  const handleCancel = useCallback(
    (id: string) => {
      const appt = appointments.find((a) => a.id === id)
      if (!appt) return

      updateAppointment(id, { status: 'cancelled' })
      setCancelledSlot(appt)
      setWaitlistOpen(true)
    },
    [appointments, updateAppointment]
  )

  const handleNotifyWaitlist = useCallback(() => {
    if (!cancelledSlot) return
    addToast({
      type: 'success',
      message: `📲 Waitlist notified about the ${cancelledSlot.scheduledTime} opening. Revenue recovered!`,
    })
    setWaitlistOpen(false)
    setCancelledSlot(null)
  }, [cancelledSlot, addToast])

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <StatsBar appointments={appointments} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <KanbanBoard
          appointments={appointments}
          onSelectAppointment={setSelectedId}
          onSendReminder={handleSendReminder}
          onMarkComplete={handleMarkComplete}
          onCancel={handleCancel}
        />
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

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  )
}
