'use client'

import { CheckCircle, Clock, AlertTriangle, Calendar, Star } from 'lucide-react'
import { Appointment } from '@/types'

interface StatsBarProps {
  appointments: Appointment[]
}

export function StatsBar({ appointments }: StatsBarProps) {
  const total = appointments.filter(a => a.status !== 'cancelled').length
  const confirmed = appointments.filter(a => a.status === 'confirmed').length
  const pending = appointments.filter(
    a => a.status === 'reminder_sent' || a.status === 'rescheduling' || a.status === 'scheduled'
  ).length
  const atRisk = appointments.filter(a => a.status === 'at_risk').length
  const completed = appointments.filter(a => a.status === 'completed').length

  const stats = [
    { label: "Today's jobs",   value: total,     icon: Calendar,      color: '#f97316' },
    { label: 'Confirmed',      value: confirmed,  icon: CheckCircle,   color: '#34d399' },
    { label: 'Awaiting reply', value: pending,    icon: Clock,         color: '#fbbf24' },
    { label: 'At risk',        value: atRisk,     icon: AlertTriangle, color: '#f87171' },
    { label: 'Completed',      value: completed,  icon: Star,          color: '#a78bfa' },
  ]

  return (
    <div style={{ background: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center">
                {i > 0 && (
                  <div
                    className="w-px h-3 mx-3"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                )}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors">
                  <Icon className="w-3 h-3" style={{ color: stat.color }} />
                  <span
                    className="text-base font-bold tabular-nums font-display"
                    style={{ color: stat.color, letterSpacing: '-0.02em' }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#3a3a48' }}>{stat.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
