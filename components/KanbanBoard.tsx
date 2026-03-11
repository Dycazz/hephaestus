'use client'

import { CheckCircle, Clock, AlertTriangle, Star } from 'lucide-react'
import { Appointment } from '@/types'
import { AppointmentCard } from './AppointmentCard'

interface KanbanBoardProps {
  appointments: Appointment[]
  onSelectAppointment: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
}

interface ColumnProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  count: number
  accentColor: string
  headerBg: string
  accentBorder: string
  appointments: Appointment[]
  onSelectAppointment: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
}

function Column({
  title,
  subtitle,
  icon,
  count,
  accentColor,
  headerBg,
  accentBorder,
  appointments,
  onSelectAppointment,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
}: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-xl border ${headerBg} p-3 flex items-center justify-between border-l-4 ${accentBorder}`}>
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <p className="font-semibold text-sm text-white">{title}</p>
            <p className="text-xs text-white/50">{subtitle}</p>
          </div>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${accentColor}`}>{count}</span>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center flex flex-col items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mb-1">
            {icon}
          </div>
          <p className="text-xs font-medium text-slate-600">No appointments here</p>
          <p className="text-[11px] text-slate-700">{subtitle}</p>
        </div>
      ) : (
        appointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appointment={appt}
            onSelect={onSelectAppointment}
            onSendReminder={onSendReminder}
            onMarkComplete={onMarkComplete}
            onCancel={onCancel}
            onReschedule={onReschedule}
          />
        ))
      )}
    </div>
  )
}

export function KanbanBoard({
  appointments,
  onSelectAppointment,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
}: KanbanBoardProps) {
  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const pending = appointments.filter(
    a => a.status === 'reminder_sent' || a.status === 'rescheduling' || a.status === 'scheduled'
  )
  const atRisk = appointments.filter(a => a.status === 'at_risk')
  const completed = appointments.filter(a => a.status === 'completed')

  return (
    <div className="space-y-6">
      {/* Main 3-column kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Column
          title="Ready to Roll"
          subtitle="Confirmed & prepped"
          icon={<CheckCircle className="w-4 h-4 text-green-500" />}
          count={confirmed.length}
          accentColor="text-green-500"
          headerBg="bg-green-900/15 border-green-900/40"
          accentBorder="border-l-green-600"
          appointments={confirmed}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
        />

        <Column
          title="Awaiting Response"
          subtitle="Reminder sent, no reply yet"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          count={pending.length}
          accentColor="text-amber-500"
          headerBg="bg-amber-900/15 border-amber-900/40"
          accentBorder="border-l-amber-500"
          appointments={pending}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
        />

        <Column
          title="Needs Attention"
          subtitle="No response — step in now"
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          count={atRisk.length}
          accentColor="text-red-500"
          headerBg="bg-red-900/15 border-red-900/40"
          accentBorder="border-l-red-600"
          appointments={atRisk}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
        />
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-400">Completed Today</h3>
            <span className="text-xs bg-blue-900/30 text-blue-400 rounded-full px-2 py-0.5">
              {completed.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completed.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onSelect={onSelectAppointment}
                onSendReminder={onSendReminder}
                onMarkComplete={onMarkComplete}
                onCancel={onCancel}
                onReschedule={onReschedule}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
