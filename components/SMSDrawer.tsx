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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col"
        style={{ background: '#0d0f17', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div
          className="px-4 py-4 flex items-start justify-between shrink-0"
          style={{ background: '#0d0f17', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-slate-700/60 rounded-lg p-2">
              <MessageSquare className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white/90">{appointment.customerName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-500">{appointment.customerPhone}</p>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {appointment.service} · {appointment.scheduledDate} at {appointment.scheduledTime}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SMS Thread */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ background: '#111318' }}
        >
          {appointment.smsThread.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
              <MessageSquare className="w-10 h-10 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a reminder to start the conversation</p>
            </div>
          ) : (
            appointment.smsThread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'system' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    msg.from === 'system'
                      ? msg.type === 'review_request'
                        ? 'rounded-tl-sm'
                        : 'rounded-tl-sm'
                      : 'rounded-tr-sm'
                  }`}
                  style={
                    msg.from === 'customer'
                      ? { background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.07)' }
                      : msg.type === 'review_request'
                      ? { background: '#92400e', color: '#fef3c7', border: '1px solid rgba(245,158,11,0.2)' }
                      : { background: '#1e3a5f', color: '#e2e8f0' }
                  }
                >
                  {msg.type === 'review_request' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs font-semibold text-amber-200">Review request</span>
                    </div>
                  )}
                  {msg.type === 'reschedule_link' ? (
                    <div>
                      <p className="text-sm">No problem! Here&apos;s a link to pick a new time:</p>
                      <span className="inline-block mt-1 bg-white/10 rounded px-2 py-0.5 text-xs font-mono underline">
                        reschedule link
                      </span>
                    </div>
                  ) : (
                    <p className="leading-snug">{msg.text}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.from === 'system' ? 'text-white/40' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div
          className="shrink-0 p-4 space-y-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0d0f17' }}
        >
{canComplete && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs font-medium text-slate-500 mb-2">Mark job complete</p>
              <button
                onClick={() => { onMarkComplete(appointment.id); onClose() }}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Complete — queue review request
              </button>
            </div>
          )}

          {canSendReview && (
            <div
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs font-medium text-slate-500 mb-2">Send review request</p>
              <button
                onClick={() => onMarkComplete(appointment.id)}
                className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Send review request now
              </button>
            </div>
          )}

          {appointment.status === 'completed' && appointment.reviewRequestSent && (
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Star className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white/80">Review request sent</p>
                <p className="text-xs text-slate-600 mt-0.5">Google review link texted to customer.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
