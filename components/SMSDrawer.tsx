'use client'

import { X, MessageSquare, Phone, Star } from 'lucide-react'
import { Appointment } from '@/types'

interface SMSDrawerProps {
  appointment: Appointment
  onClose: () => void
  onMarkComplete: (id: string) => void
}

export function SMSDrawer({ appointment, onClose, onMarkComplete }: SMSDrawerProps) {
  const canComplete = appointment.status === 'confirmed'
  const canSendReview = appointment.status === 'completed' && !appointment.reviewRequestSent

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-black/95 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-orange-300">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">{appointment.customerName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-white/40" />
                <p className="text-xs text-white/50">{appointment.customerPhone}</p>
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                {appointment.service} · {appointment.scheduledDate} at {appointment.scheduledTime}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 transition hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-black px-4 py-4">
          {appointment.smsThread.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/50">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a reminder to start the conversation</p>
            </div>
          ) : (
            appointment.smsThread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'system' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    msg.from === 'customer'
                      ? 'rounded-tr-sm border border-white/10 bg-white/5 text-white/80'
                      : msg.type === 'review_request'
                      ? 'rounded-tl-sm border border-orange-500/20 bg-orange-500/15 text-orange-100'
                      : 'rounded-tl-sm bg-orange-500/10 text-white/90'
                  }`}
                >
                  {msg.type === 'review_request' && (
                    <div className="mb-1 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-orange-300" />
                      <span className="text-xs font-semibold text-orange-200">Review request</span>
                    </div>
                  )}
                  {msg.type === 'reschedule_link' ? (
                    <div>
                      <p className="text-sm">No problem! Here&apos;s a link to pick a new time:</p>
                      <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-xs font-mono underline">
                        reschedule link
                      </span>
                    </div>
                  ) : (
                    <p className="leading-snug">{msg.text}</p>
                  )}
                  <p className={`mt-1 text-[10px] ${msg.from === 'system' ? 'text-white/40' : 'text-white/35'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 space-y-2.5 border-t border-white/10 bg-black/95 p-4">
          {canComplete && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-medium text-white/50">Mark job complete</p>
              <button
                onClick={() => {
                  onMarkComplete(appointment.id)
                  onClose()
                }}
                className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-black transition hover:bg-orange-400"
              >
                Complete — queue review request
              </button>
            </div>
          )}

          {canSendReview && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-medium text-white/50">Send review request</p>
              <button
                onClick={() => onMarkComplete(appointment.id)}
                className="w-full rounded-lg border border-orange-400/40 bg-orange-500/10 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
              >
                Send review request now
              </button>
            </div>
          )}

          {appointment.status === 'completed' && appointment.reviewRequestSent && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <Star className="h-4 w-4 text-orange-300" />
              <div>
                <p className="text-xs font-medium text-white/80">Review request sent</p>
                <p className="mt-0.5 text-xs text-white/40">Google review link texted to customer.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
