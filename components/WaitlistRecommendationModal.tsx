'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, MapPin, MessageSquare, Plus, Loader2, Calendar } from 'lucide-react'
import { Appointment } from '@/types'

interface WaitlistEntry {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address?: string
  notes?: string
  service?: {
    name: string
    icon: string
    color: string
  }
  created_at: string
}

interface WaitlistRecommendationModalProps {
  canceledAppointment: Appointment
  onClose: () => void
  onBookWaitlist: (entry: WaitlistEntry) => void
}

export function WaitlistRecommendationModal({
  canceledAppointment,
  onClose,
  onBookWaitlist,
}: WaitlistRecommendationModalProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/waitlist')
      .then(r => r.ok ? r.json() : { waitlist: [] })
      .then(data => {
        setWaitlist(data.waitlist || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-morphism w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between border-b border-[rgba(44,52,64,0.3)] px-6 py-4 bg-orange-500/5">
          <div>
            <p className="text-lg font-semibold text-orange-400">Spot Opened Up!</p>
            <p className="text-sm text-text-muted">
              {canceledAppointment.customerName}&apos;s spot on {canceledAppointment.scheduledDate} at {canceledAppointment.scheduledTime} is now free.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted/60 hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Recommended Waitlist Clients
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-accent/60" />
              <p className="text-sm text-text-muted">Checking waitlist…</p>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[rgba(44,52,64,0.3)] bg-[rgba(44,52,64,0.05)]">
              <p className="text-sm text-text-muted">No one is currently on the waitlist.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {waitlist.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative flex items-center gap-4 rounded-xl border border-[rgba(44,52,64,0.3)] bg-[rgba(44,52,64,0.1)] p-4 transition-all hover:bg-[rgba(44,52,64,0.15)] hover:border-[rgba(44,52,64,0.4)]"
                >
                  <div 
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                    style={{ background: entry.service?.color ? `${entry.service.color}20` : 'rgba(44,52,64,0.15)' }}
                  >
                    {entry.service?.icon || '👤'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="font-semibold text-text-primary truncate">{entry.customer_name}</p>
                      {entry.service && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">
                          • {entry.service.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-text-muted" />
                        {entry.customer_phone}
                      </div>
                      {entry.customer_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-text-muted" />
                          <span className="truncate max-w-[200px]">{entry.customer_address}</span>
                        </div>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-text-muted italic line-clamp-1 border-l-2 border-[rgba(44,52,64,0.3)] pl-2">
                        &ldquo;{entry.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${entry.customer_phone}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(44,52,64,0.3)] bg-[rgba(44,52,64,0.1)] text-text-secondary transition hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-400/30"
                      title="Call client"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onBookWaitlist(entry)}
                      className="flex h-9 px-4 items-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white transition hover:filter hover:brightness-110 shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.2)]"
                    >
                      <Plus className="w-4 h-4" /> Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-[rgba(44,52,64,0.3)] px-6 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-[rgba(44,52,64,0.1)]"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
