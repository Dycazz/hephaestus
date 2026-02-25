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
    {
      label: "Today's Jobs",
      value: total,
      icon: Calendar,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      label: 'Confirmed',
      value: confirmed,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      label: 'Awaiting Reply',
      value: pending,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      label: 'At Risk',
      value: atRisk,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      label: 'Completed',
      value: completed,
      icon: Star,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
  ]

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
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
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
              </div>
            )
          })}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Auto-synced with Google Calendar
          </div>
        </div>
      </div>
    </div>
  )
}
