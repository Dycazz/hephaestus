'use client'

import { X, Users, MessageSquare } from 'lucide-react'
import { Appointment } from '@/types'
import { waitlistContacts } from '@/lib/mockData'

interface WaitlistModalProps {
  cancelledSlot: Appointment
  onNotify: () => void
  onDismiss: () => void
}

export function WaitlistModal({ cancelledSlot, onNotify, onDismiss }: WaitlistModalProps) {
  const previewText = `Hi! We had a cancellation and have an opening at ${cancelledSlot.scheduledTime} today. Would you like us to come by then? Reply YES to grab the slot!`

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-morphism rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 backdrop-blur-md p-5 border-b border-[rgba(44,52,64,0.3)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 rounded-full p-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-lg text-text-primary">Gap-Filling Opportunity!</p>
                  <p className="text-sm text-text-secondary/70">Auto-detected open slot</p>
                </div>
              </div>
              <button onClick={onDismiss} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Slot info */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-sm font-semibold text-emerald-400">
                🕐 {cancelledSlot.scheduledTime} slot just opened up
              </p>
              <p className="text-xs text-text-secondary/80 mt-1">
                {cancelledSlot.customerName} cancelled their {cancelledSlot.service} appointment.
                Revenue can be recovered!
              </p>
            </div>

            {/* Waitlist contacts */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-text-muted" />
                Waitlist contacts to notify ({waitlistContacts.length})
              </p>
              <div className="space-y-2">
                {waitlistContacts.map((contact) => (
                  <div
                    key={contact.phone}
                    className="flex items-center justify-between bg-[rgba(44,52,64,0.1)] rounded-lg px-3 py-2 border border-[rgba(44,52,64,0.2)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{contact.name}</p>
                      <p className="text-xs text-text-muted">{contact.phone}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-text-muted" />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview SMS */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-400 mb-1.5">📱 Text preview:</p>
              <p className="text-sm text-text-secondary leading-snug italic">&ldquo;{previewText}&rdquo;</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 py-2.5 border border-[rgba(44,52,64,0.3)] text-text-secondary text-sm font-medium rounded-xl hover:bg-[rgba(44,52,64,0.1)] transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onNotify}
                className="flex-2 flex-grow py-2.5 bg-emerald-600 hover:filter hover:brightness-110 text-white text-sm font-semibold rounded-xl transition-all shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.2)]"
              >
                ✓ Notify Waitlist Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
