export type AppointmentStatus =
  | 'scheduled'      // No reminder sent yet
  | 'reminder_sent'  // Reminder sent, awaiting reply (YELLOW)
  | 'confirmed'      // Customer replied 1 (GREEN)
  | 'rescheduling'   // Customer replied 2 (YELLOW)
  | 'at_risk'        // No response 12hrs out (RED)
  | 'completed'      // Job done
  | 'cancelled'      // Cancelled

export type SMSMessageType =
  | 'reminder'
  | 'confirmation'
  | 'reschedule_link'
  | 'review_request'
  | 'waitlist_offer'
  | 'customer_reply'

export interface SMSMessage {
  id: string
  from: 'system' | 'customer'
  text: string
  timestamp: string
  type?: SMSMessageType
}

export interface Appointment {
  id: string
  customerName: string
  customerPhone: string
  service: string
  serviceIcon: string
  serviceColor: string
  scheduledTime: string
  scheduledDate: string
  technician: string        // display name
  technicianId?: string     // DB uuid — set when creating, used for API calls
  address: string
  status: AppointmentStatus
  prepChecklist: string[]
  smsThread: SMSMessage[]
  reviewRequestSent: boolean
  notes?: string
}

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}
