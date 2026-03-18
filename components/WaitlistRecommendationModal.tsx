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
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/95 text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-4 bg-orange-500/10">
          <div>
            <p className="text-lg font-semibold text-orange-400">Spot Opened Up!</p>
            <p className="text-sm text-white/60">
              {canceledAppointment.customerName}&apos;s spot on {canceledAppointment.scheduledDate} at {canceledAppointment.scheduledTime} is now free.
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Recommended Waitlist Clients
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500/60" />
              <p className="text-sm text-white/40">Checking waitlist…</p>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/10 bg-white/5">
              <p className="text-sm text-white/40">No one is currently on the waitlist.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {waitlist.map((entry) => (
                <div
                  key={entry.id}
                  className="group relative flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div 
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                    style={{ background: entry.service?.color ? `${entry.service.color}20` : 'rgba(255,255,255,0.05)' }}
                  >
                    {entry.service?.icon || '👤'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{entry.customer_name}</p>
                      {entry.service && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 truncate">
                          • {entry.service.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {entry.customer_phone}
                      </div>
                      {entry.customer_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{entry.customer_address}</span>
                        </div>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="mt-2 text-xs text-white/40 italic line-clamp-1 border-l-2 border-white/10 pl-2">
                        &ldquo;{entry.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${entry.customer_phone}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-blue-500/20 hover:text-blue-400"
                      title="Call client"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onBookWaitlist(entry)}
                      className="flex h-9 px-4 items-center gap-2 rounded-lg bg-orange-500 text-sm font-semibold text-black transition hover:bg-orange-400"
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
              className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
