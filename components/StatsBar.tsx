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
    { label: "Today's jobs", value: total, icon: Calendar, color: 'text-orange-400' },
    { label: 'Confirmed', value: confirmed, icon: CheckCircle, color: 'text-orange-300' },
    { label: 'Awaiting reply', value: pending, icon: Clock, color: 'text-amber-300' },
    { label: 'At risk', value: atRisk, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Completed', value: completed, icon: Star, color: 'text-text-secondary/70' },
  ]

  return (
    <div className="border-b border-border bg-surface/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="mx-3 h-3 w-px bg-border" />}
                <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                  <Icon className={`h-3 w-3 ${stat.color}`} />
                  <span className={`font-display text-base font-bold tabular-nums ${stat.color}`}>
                    {stat.value}
                  </span>
                  <span className="text-xs font-medium text-text-secondary/60">{stat.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
