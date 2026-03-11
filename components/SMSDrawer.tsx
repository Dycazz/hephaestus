'use client'

import { X, MessageSquare, Phone, Star } from 'lucide-react'
import { Appointment } from '@/types'

interface SMSDrawerProps {
  appointment: Appointment
  onClose: () => void
  onSimulateReply: (id: string, reply: '1' | '2') => void
  onMarkComplete: (id: string) => void
}

export function SMSDrawer({ appointment, onClose, onSimulateReply, onMarkComplete }: SMSDrawerProps) {
  const canSimulate = appointment.status === 'reminder_sent' || appointment.status === 'at_risk'
  const canComplete = appointment.status === 'confirmed'
  const canSendReview = appointment.status === 'completed' && !appointment.reviewRequestSent

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col"
        style={{ background: '#0a1628', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="text-white px-4 py-4 flex items-start justify-between shrink-0"
          style={{ background: 'linear-gradient(to right, #0a1628, #0d2045)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-full p-2 shadow-lg shadow-blue-500/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{appointment.customerName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-blue-300/70" />
                <p className="text-xs text-blue-300/70">{appointment.customerPhone}</p>
              </div>
              <p className="text-xs text-blue-300/50 mt-0.5">
                {appointment.service} · {appointment.scheduledDate} at {appointment.scheduledTime}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-300/60 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SMS Thread */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ background: '#0d1830' }}
        >
          {appointment.smsThread.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
              <MessageSquare className="w-10 h-10 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a reminder to start the conversation</p>
            </div>
          ) : (
            appointment.smsThread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'system' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  msg.from === 'system'
                    ? msg.type === 'review_request'
                      ? 'bg-amber-500 text-white rounded-tl-sm'
                      : 'text-white rounded-tl-sm'
                    : 'rounded-tr-sm'
                }`}
                  style={
                    msg.from === 'customer'
                      ? { background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }
                      : msg.from === 'system' && msg.type !== 'review_request'
                      ? { background: 'linear-gradient(135deg, #1e40af, #1d4ed8)' }
                      : undefined
                  }
                >
                  {msg.type === 'review_request' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">Review Request</span>
                    </div>
                  )}
                  {msg.type === 'reschedule_link' ? (
                    <div>
                      <p className="text-sm">No problem! Here&apos;s a link to pick a new time:</p>
                      <span className="inline-block mt-1 bg-white/20 rounded px-2 py-0.5 text-xs font-mono underline">
                        reschedule link
                      </span>
                    </div>
                  ) : (
                    <p className="leading-snug">{msg.text}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.from === 'system' ? 'text-white/60' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div className="shrink-0 p-4 space-y-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d1f3c' }}
        >
          {canSimulate && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(180,83,9,0.4)' }}
            >
              <p className="text-xs font-semibold text-amber-400 mb-2">🎮 Simulate Customer Reply</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSimulateReply(appointment.id, '1')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Reply &ldquo;1&rdquo; → Confirm
                </button>
                <button
                  onClick={() => onSimulateReply(appointment.id, '2')}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Reply &ldquo;2&rdquo; → Reschedule
                </button>
              </div>
            </div>
          )}

          {canComplete && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(4,120,87,0.4)' }}
            >
              <p className="text-xs font-semibold text-emerald-400 mb-2">✓ Mark Job Complete</p>
              <button
                onClick={() => { onMarkComplete(appointment.id); onClose() }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Complete → Queue Review Request
              </button>
            </div>
          )}

          {canSendReview && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(180,83,9,0.4)' }}
            >
              <p className="text-xs font-semibold text-amber-400 mb-2">⭐ Send Google Review Request</p>
              <button
                onClick={() => onMarkComplete(appointment.id)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Send Review Request Now
              </button>
            </div>
          )}

          {appointment.status === 'completed' && appointment.reviewRequestSent && (
            <div className="rounded-xl border p-3 text-center"
              style={{ background: 'linear-gradient(135deg, #0a1628, #0d2045)', borderColor: '#1e3a6e' }}
            >
              <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">Review request sent!</p>
              <p className="text-xs text-blue-300/60 mt-0.5">Google review link texted to customer.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
