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
    { label: "Today's jobs",   value: total,     icon: Calendar,      color: '#60a5fa', dim: 'rgba(96,165,250,0.1)'  },
    { label: 'Confirmed',      value: confirmed,  icon: CheckCircle,   color: '#34d399', dim: 'rgba(52,211,153,0.1)'  },
    { label: 'Awaiting reply', value: pending,    icon: Clock,         color: '#fbbf24', dim: 'rgba(251,191,36,0.1)'  },
    { label: 'At risk',        value: atRisk,     icon: AlertTriangle, color: '#f87171', dim: 'rgba(248,113,113,0.1)' },
    { label: 'Completed',      value: completed,  icon: Star,          color: '#818cf8', dim: 'rgba(129,140,248,0.1)' },
  ]

  return (
    <div style={{ background: '#0d0f17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: stat.dim, border: `1px solid ${stat.color}18` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <span className="text-base font-semibold tabular-nums" style={{ color: stat.color }}>{stat.value}</span>
                <span className="text-xs text-slate-500 font-normal">{stat.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
