'use client'

import { CheckCircle, Clock, AlertTriangle, Star } from 'lucide-react'
import { Appointment } from '@/types'
import { Technician } from '@/hooks/useTechnicians'
import { AppointmentCard } from './AppointmentCard'

interface KanbanBoardProps {
  appointments: Appointment[]
  technicians: Technician[]
  onSelectAppointment: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
  onScheduleFollowUp: (appointment: Appointment) => void
  onAssignTechnician: (appointmentId: string, technicianId: string, technicianName: string) => void
  readOnly?: boolean
  hideCompleted?: boolean
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
  technicians: Technician[]
  onSelectAppointment: (id: string) => void
  onSendReminder: (id: string) => void
  onMarkComplete: (id: string) => void
  onCancel: (id: string) => void
  onReschedule: (id: string) => void
  onScheduleFollowUp: (appointment: Appointment) => void
  onAssignTechnician: (appointmentId: string, technicianId: string, technicianName: string) => void
  readOnly?: boolean
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
  technicians,
  onSelectAppointment,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
  onScheduleFollowUp,
  onAssignTechnician,
  readOnly = false,
}: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center justify-between rounded-xl border p-3 ${headerBg} border-l-4 ${accentBorder} shadow-[0_4px_12px_rgba(0,0,0,0.1)] backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/5 shadow-inner">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">{title}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{subtitle}</p>
          </div>
        </div>
        <span className={`text-2xl font-black tabular-nums ${accentColor} drop-shadow-sm`}>{count}</span>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/5 bg-white/[0.02] p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-white/20">
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/40 tracking-tight text-balance">No active jobs in this stage</p>
            <p className="text-[10px] text-white/25 leading-relaxed max-w-[12rem] mx-auto">{subtitle}</p>
          </div>
        </div>
      ) : (
        appointments.map((appt) => (
          <AppointmentCard
            key={appt.id}
            appointment={appt}
            technicians={technicians}
            onSelect={onSelectAppointment}
            onSendReminder={onSendReminder}
            onMarkComplete={onMarkComplete}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onScheduleFollowUp={onScheduleFollowUp}
            onAssignTechnician={onAssignTechnician}
            readOnly={readOnly}
          />
        ))
      )}
    </div>
  )
}

export function KanbanBoard({
  appointments,
  technicians,
  onSelectAppointment,
  onSendReminder,
  onMarkComplete,
  onCancel,
  onReschedule,
  onScheduleFollowUp,
  onAssignTechnician,
  readOnly = false,
  hideCompleted = false,
}: KanbanBoardProps) {
  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const pending = appointments.filter(
    a => a.status === 'reminder_sent' || a.status === 'rescheduling' || a.status === 'scheduled'
  )
  const atRisk = appointments.filter(a => a.status === 'at_risk')
  const completed = appointments.filter(a => a.status === 'completed')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Column
          title="Ready to Roll"
          subtitle="Confirmed & prepped"
          icon={<CheckCircle className="h-4 w-4 text-orange-300" />}
          count={confirmed.length}
          accentColor="text-orange-300"
          headerBg="bg-orange-500/10 border-orange-500/20"
          accentBorder="border-l-orange-400"
          appointments={confirmed}
          technicians={technicians}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onScheduleFollowUp={onScheduleFollowUp}
          onAssignTechnician={onAssignTechnician}
          readOnly={readOnly}
        />

        <Column
          title="Awaiting Response"
          subtitle="Reminder sent, no reply yet"
          icon={<Clock className="h-4 w-4 text-amber-300" />}
          count={pending.length}
          accentColor="text-amber-300"
          headerBg="bg-amber-500/10 border-amber-500/20"
          accentBorder="border-l-amber-400"
          appointments={pending}
          technicians={technicians}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onScheduleFollowUp={onScheduleFollowUp}
          onAssignTechnician={onAssignTechnician}
          readOnly={readOnly}
        />

        <Column
          title="Needs Attention"
          subtitle="No response — step in now"
          icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
          count={atRisk.length}
          accentColor="text-red-400"
          headerBg="bg-red-500/10 border-red-500/20"
          accentBorder="border-l-red-400"
          appointments={atRisk}
          technicians={technicians}
          onSelectAppointment={onSelectAppointment}
          onSendReminder={onSendReminder}
          onMarkComplete={onMarkComplete}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onScheduleFollowUp={onScheduleFollowUp}
          onAssignTechnician={onAssignTechnician}
          readOnly={readOnly}
        />
      </div>

      {!hideCompleted && completed.length > 0 && (
        <div className="mt-8 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-300" />
            <h3 className="text-sm font-semibold text-white/70">Completed Today</h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
              {completed.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {completed.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                technicians={technicians}
                onSelect={onSelectAppointment}
                onSendReminder={onSendReminder}
                onMarkComplete={onMarkComplete}
                onCancel={onCancel}
                onReschedule={onReschedule}
                onScheduleFollowUp={onScheduleFollowUp}
                onAssignTechnician={onAssignTechnician}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
