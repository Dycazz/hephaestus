'use client'

import { X, MessageSquare, Phone, Star, FileText } from 'lucide-react'
import Link from 'next/link'
import { Appointment } from '@/types'

interface SMSDrawerProps {
  appointment: Appointment
  onClose: () => void
  onMarkComplete: (id: string) => void
  onScheduleFollowUp: (appointment: Appointment) => void
  readOnly?: boolean
}

export function SMSDrawer({ appointment, onClose, onMarkComplete, onScheduleFollowUp, readOnly = false }: SMSDrawerProps) {
  const canComplete = !readOnly && appointment.status === 'confirmed'
  const canSendReview = !readOnly && appointment.status === 'completed' && !appointment.reviewRequestSent
  const isCompleted = appointment.status === 'completed'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col glass-panel shadow-2xl transition-transform">
        <div className="flex items-start justify-between border-b border-border px-4 py-4 bg-surface-elevated/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border bg-surface-elevated p-2 text-orange-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary/90">{appointment.customerName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-text-muted" />
                <p className="text-xs text-text-secondary">{appointment.customerPhone}</p>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                {appointment.service} · {appointment.scheduledDate} at {appointment.scheduledTime}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted transition hover:text-text-primary hover:bg-surface-elevated">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-surface/50 px-4 py-4">
          {appointment.smsThread.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a reminder to start the conversation</p>
            </div>
          ) : (
            appointment.smsThread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'system' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm backdrop-blur-md ${
                    msg.from === 'customer'
                      ? 'rounded-tr-sm border border-white/10 bg-white/5 text-text-primary'
                      : msg.type === 'review_request'
                      ? 'rounded-tl-sm border border-orange-500/20 bg-orange-500/15 text-text-primary'
                      : 'rounded-tl-sm bg-accent/10 border border-accent/20 text-text-primary'
                  }`}
                >
                  {msg.type === 'review_request' && (
                    <div className="mb-1 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-semibold text-orange-500">Review request</span>
                    </div>
                  )}
                  {msg.type === 'reschedule_link' ? (
                    <div>
                      <p className="text-sm">No problem! Here&apos;s a link to pick a new time:</p>
                      <span className="mt-1 inline-block rounded bg-surface-elevated border border-border px-2 py-0.5 text-xs font-mono underline text-accent">
                        reschedule link
                      </span>
                    </div>
                  ) : (
                    <p className="leading-snug">{msg.text}</p>
                  )}
                  <p className={`mt-1 text-[10px] ${msg.from === 'system' ? 'text-text-muted' : 'text-text-muted/80'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 space-y-2.5 border-t border-border bg-surface-elevated/30 p-4">
          {canComplete && (
            <div className="rounded-xl border border-border bg-surface-elevated/50 p-3">
              <p className="mb-2 text-xs font-medium text-text-muted">Job options</p>
              <button
                onClick={() => {
                  onMarkComplete(appointment.id)
                  onClose()
                }}
                className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 shadow-sm"
              >
                Complete Job
              </button>
            </div>
          )}

          {isCompleted && !readOnly && (
            <div className="rounded-xl border border-border bg-surface-elevated/50 p-3">
              <p className="mb-2 text-xs font-medium text-text-muted">Follow-up</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onScheduleFollowUp(appointment)
                    onClose()
                  }}
                  className="w-full rounded-lg border border-orange-500/30 bg-orange-500/10 py-2 text-sm font-semibold text-orange-500 transition hover:bg-orange-500/20"
                >
                  Schedule Follow-up
                </button>
                <Link
                  href={`/invoices/new?appointment_id=${appointment.id}&service=${encodeURIComponent(appointment.service)}${appointment.priceCents != null ? `&price_cents=${appointment.priceCents}` : ''}`}
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-sm font-semibold text-amber-500 transition hover:bg-amber-500/20"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Create Invoice
                </Link>
              </div>
            </div>
          )}

          {canSendReview && (
            <div className="rounded-xl border border-border bg-surface-elevated/50 p-3">
              <p className="mb-2 text-xs font-medium text-text-muted">Send review request</p>
              <button
                onClick={() => onMarkComplete(appointment.id)}
                className="w-full rounded-lg border border-orange-500/30 bg-orange-500/10 py-2 text-sm font-semibold text-orange-500 transition hover:bg-orange-500/20"
              >
                Send review request now
              </button>
            </div>
          )}

          {appointment.status === 'completed' && appointment.reviewRequestSent && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/50 p-3">
              <Star className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-xs font-medium text-text-primary/80">Review request sent</p>
                <p className="mt-0.5 text-xs text-text-muted">Google review link texted to customer.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
