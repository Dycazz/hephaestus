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
  appointments,
  onSelectAppointment,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
}: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-xl border ${headerBg} p-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="font-semibold text-sm text-white">{title}</p>
            <p className="text-xs text-white/60">{subtitle}</p>
          </div>
        </div>
        <span className={`text-lg font-bold ${accentColor}`}>{count}</span>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-600">
          No appointments
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
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          count={confirmed.length}
          accentColor="text-green-600"
          headerBg="bg-green-900/20 border-green-800/50"
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
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          count={pending.length}
          accentColor="text-amber-600"
          headerBg="bg-amber-900/20 border-amber-800/50"
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
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          count={atRisk.length}
          accentColor="text-red-600"
          headerBg="bg-red-900/20 border-red-800/50"
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
