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
    { label: "Today's Jobs",   value: total,     icon: Calendar,      color: 'text-blue-400',  bg: 'bg-white/5',   border: 'border-white/10' },
    { label: 'Confirmed',      value: confirmed,  icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Awaiting Reply', value: pending,    icon: Clock,         color: 'text-amber-400', bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    { label: 'At Risk',        value: atRisk,     icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/10',     border: 'border-red-500/20' },
    { label: 'Completed',      value: completed,  icon: Star,          color: 'text-sky-400',   bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
  ]

  return (
    <div className="border-b border-white/5 shadow-sm"
      style={{ background: 'linear-gradient(to right, #0d2045, #0f2a55, #0d2045)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${stat.bg} ${stat.border}`}
              >
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs text-blue-200/60 font-medium">{stat.label}</span>
              </div>
            )
          })}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-blue-300/40">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Auto-synced with Google Calendar
          </div>
        </div>
      </div>
    </div>
  )
}
