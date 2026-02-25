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
  const canSimulate =
    appointment.status === 'reminder_sent' || appointment.status === 'at_risk'
  const canComplete = appointment.status === 'confirmed'
  const canSendReview = appointment.status === 'completed' && !appointment.reviewRequestSent

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-4 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-full p-2">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{appointment.customerName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-300" />
                <p className="text-xs text-slate-300">{appointment.customerPhone}</p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {appointment.service} · {appointment.scheduledDate} at {appointment.scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SMS Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {appointment.smsThread.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a reminder to start the conversation</p>
            </div>
          ) : (
            appointment.smsThread.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'system' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    msg.from === 'system'
                      ? msg.type === 'review_request'
                        ? 'bg-yellow-500 text-white rounded-tl-sm'
                        : 'bg-blue-600 text-white rounded-tl-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tr-sm'
                  }`}
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
                        mikesplumbing.com/reschedule
                      </span>
                    </div>
                  ) : (
                    <p className="leading-snug">{msg.text}</p>
                  )}
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.from === 'system' ? 'text-white/60' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Simulation Panel */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 space-y-3">
          {canSimulate && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                🎮 Demo: Simulate Customer Reply
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onSimulateReply(appointment.id, '1')}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
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
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-semibold text-green-700 mb-2">
                🎮 Demo: Simulate Job Completion
              </p>
              <button
                onClick={() => {
                  onMarkComplete(appointment.id)
                  onClose()
                }}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ✓ Mark Job Complete → Trigger Review Request
              </button>
            </div>
          )}

          {canSendReview && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-2">
                ⭐ Demo: Simulate 2-Hour Delay
              </p>
              <button
                onClick={() => onMarkComplete(appointment.id)}
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Send Google Review Request Now
              </button>
            </div>
          )}

          {appointment.status === 'completed' && appointment.reviewRequestSent && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
              <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-blue-700">Review request sent!</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Customer has been texted the Google review link.
              </p>
            </div>
          )}

          {appointment.status === 'confirmed' && !canComplete && (
            <p className="text-xs text-slate-400 text-center">
              Mark job complete when technician finishes
            </p>
          )}
        </div>
      </div>
    </>
  )
}
