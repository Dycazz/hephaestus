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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-lg">Gap-Filling Opportunity!</p>
                  <p className="text-sm text-emerald-100">Auto-detected open slot</p>
                </div>
              </div>
              <button onClick={onDismiss} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Slot info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-emerald-800">
                🕐 {cancelledSlot.scheduledTime} slot just opened up
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {cancelledSlot.customerName} cancelled their {cancelledSlot.service} appointment.
                Revenue can be recovered!
              </p>
            </div>

            {/* Waitlist contacts */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Waitlist contacts to notify ({waitlistContacts.length})
              </p>
              <div className="space-y-2">
                {waitlistContacts.map((contact) => (
                  <div
                    key={contact.phone}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.phone}</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview SMS */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1.5">📱 Text preview:</p>
              <p className="text-sm text-blue-800 leading-snug italic">&ldquo;{previewText}&rdquo;</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={onNotify}
                className="flex-2 flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
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
