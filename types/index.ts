export type AppointmentStatus =
  | 'scheduled'      // No reminder sent yet
  | 'reminder_sent'  // Reminder sent, awaiting reply (YELLOW)
  | 'confirmed'      // Customer replied 1 (GREEN)
  | 'rescheduling'   // Customer replied 2 (YELLOW)
  | 'at_risk'        // No response 12hrs out (RED)
  | 'completed'      // Job done
  | 'cancelled'      // Cancelled

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

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
  scheduledTime: string          // display format "9:00 AM"
  scheduledDate: string          // display format "Today" | "Tomorrow" | "Mar 15"
  scheduledAt?: string           // full ISO datetime (populated from DB + on create)
  technician: string             // display name
  technicianId?: string          // DB uuid
  address: string
  status: AppointmentStatus
  prepChecklist: string[]
  smsThread: SMSMessage[]
  reviewRequestSent: boolean
  notes?: string
  // Scheduling v2 fields
  durationMinutes: number        // job length in minutes (default 60)
  recurrenceRule: RecurrenceRule // 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  recurrenceEndDate?: string     // ISO date "YYYY-MM-DD" (null = 1 year from start)
  parentAppointmentId?: string   // set on child occurrences of a recurring series
  autoReminder: boolean          // false = excluded from automated reminder workflows
  priceCents?: number | null     // per-appointment price override (null = use service default)
}

export interface TechnicianAvailability {
  id: string
  orgId: string
  technicianId: string
  dayOfWeek: number    // 0 = Sunday … 6 = Saturday
  startTime: string    // "08:00"
  endTime: string      // "17:00"
  isWorking: boolean
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

// ── Booking Portal ────────────────────────────────────────────────────────────

export interface BookingLink {
  id: string
  slug: string
  org_id: string
  business_name: string
  business_logo_url: string | null
  business_phone: string | null
  accent_color: string
  background_color: string
  text_color: string
  show_pricing: boolean
  require_customer_email: boolean
  require_customer_phone: boolean
  booking_window_days: number
  slot_duration_minutes: number
  is_active: boolean
  total_views: number
  total_bookings: number
}

export interface BookingService {
  id: string
  booking_link_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
  display_order: number
  is_active: boolean
}

export interface BookingAvailability {
  id: string
  booking_link_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoicePaymentMethod = 'stripe' | 'cash' | 'check' | 'other'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  appointment_id: string | null
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  created_at: string
  // joined
  appointment?: {
    id: string
    service: string
    scheduled_at: string
  }
}

export interface Invoice {
  id: string
  org_id: string
  client_id: string
  status: InvoiceStatus
  invoice_number: string
  issued_date: string   // "YYYY-MM-DD"
  due_date: string      // "YYYY-MM-DD"
  notes: string | null
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  paid_at: string | null
  payment_method: InvoicePaymentMethod | null
  stripe_payment_link_url: string | null
  pdf_storage_path: string | null
  created_at: string
  updated_at: string
  // joined
  client?: {
    id: string
    name: string
    email: string | null
    phone: string
    address: string
  }
  line_items?: InvoiceLineItem[]
}

export interface BookingOverride {
  id: string
  booking_link_id: string
  date: string
  is_available: boolean
  start_time: string | null
  end_time: string | null
}
