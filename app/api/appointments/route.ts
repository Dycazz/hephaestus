import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { notifyTechnicianAssigned } from '@/lib/notifications'
import { sendSMS } from '@/lib/sms'
import { checkLimit, getOrgPlanAccess } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

const CreateAppointmentSchema = z.object({
  clientId: z.string().uuid().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  address: z.string().min(1),
  service: z.string().min(1),
  serviceIcon: z.string(),
  serviceColor: z.string(),
  technicianId: z.string().uuid().optional(),
  technicianName: z.string().min(1),
  scheduledAt: z.string().datetime(),
  prepChecklist: z.array(z.string()).default([]),
  // Scheduling v2
  durationMinutes: z.number().int().min(15).max(480).default(60),
  recurrenceRule: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrenceEndDate: z.string().optional(),
  autoReminder: z.boolean().default(true),
  priceCents: z.number().int().min(0).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')       // ISO date string to filter by day
  const viewAs = searchParams.get('view_as')  // org_id override for admin impersonation

  // Determine which client + org filter to use
  let queryClient = supabase
  let orgFilter: string | null = null

  if (viewAs) {
    // Only admins can use view_as — check is_admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    queryClient = await createClient(true)  // service role bypasses RLS
    orgFilter = viewAs
  }

  let query = queryClient
    .from('appointments')
    .select(`
      *,
      clients ( id, name, phone, address ),
      technicians ( id, name, initials, color ),
      sms_messages ( id, direction, body, message_type, created_at )
    `)
    .not('status', 'eq', 'cancelled')
    .order('scheduled_at', { ascending: true })
    .order('created_at', { referencedTable: 'sms_messages', ascending: true })

  if (orgFilter) {
    query = query.eq('org_id', orgFilter)
  }

  if (date) {
    // Filter to a specific calendar day
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    query = query.gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString())
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const viewAs = searchParams.get('view_as')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const d = parsed.data

  // Determine which org context to use (own or impersonated)
  let orgId: string
  if (viewAs) {
    // Only admins can use view_as — check is_admin flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    orgId = viewAs
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (!profile?.org_id) return NextResponse.json({ error: 'Profile / Org not found' }, { status: 404 })
    orgId = profile.org_id
  }

  // ── Plan access check ────────────────────────────────────────────────────
  let planAccess: Awaited<ReturnType<typeof getOrgPlanAccess>>
  try {
    planAccess = await getOrgPlanAccess(orgId, supabase)
  } catch {
    return NextResponse.json({ error: 'Unable to verify account status. Please try again.' }, { status: 503 })
  }
  if (planAccess.suspended) {
    return NextResponse.json({ error: 'Your account has been suspended. Please contact support.' }, { status: 403 })
  }

  const jobLimit = await checkLimit(orgId, 'jobs', supabase)
  if (!jobLimit.allowed) {
    const isExpired = !planAccess.active
    return NextResponse.json(
      {
        error: isExpired
          ? 'Your subscription has expired. Please renew to create new appointments.'
          : `Monthly job limit reached (${jobLimit.current}/${jobLimit.limit}). Upgrade your plan to create more appointments.`,
        limitReached: true,
        current: jobLimit.current,
        limit: jobLimit.limit,
      },
      { status: 403 }
    )
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Upsert client record
  let clientId = d.clientId
  if (!clientId) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', d.customerPhone)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
    } else {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          org_id: orgId,
          name: d.customerName,
          phone: d.customerPhone,
          address: d.address,
        })
        .select('id')
        .single()
      clientId = newClient?.id
    }
  }

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      org_id: orgId,
      client_id: clientId,
      technician_id: d.technicianId ?? null,
      service: d.service,
      service_icon: d.serviceIcon,
      service_color: d.serviceColor,
      scheduled_at: d.scheduledAt,
      status: 'scheduled',
      address: d.address,
      prep_checklist: d.prepChecklist,
      duration_minutes: d.durationMinutes,
      recurrence_rule: d.recurrenceRule,
      recurrence_end_date: d.recurrenceEndDate ?? null,
      auto_reminder: d.autoReminder,
      price_cents: d.priceCents ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Generate recurring child appointments ──────────────────────────────────
  let recurringCount = 0
  if (d.recurrenceRule !== 'none' && appt) {
    const endDate = d.recurrenceEndDate
      ? new Date(d.recurrenceEndDate + 'T23:59:59')
      : (() => { const e = new Date(d.scheduledAt); e.setFullYear(e.getFullYear() + 1); return e })()

    const children: Record<string, unknown>[] = []
    let current = new Date(d.scheduledAt)

    while (children.length < 52) {
      if (d.recurrenceRule === 'daily')          current = new Date(current.getTime() + 86400000)
      else if (d.recurrenceRule === 'weekly')    current = new Date(current.getTime() + 7 * 86400000)
      else if (d.recurrenceRule === 'biweekly')  current = new Date(current.getTime() + 14 * 86400000)
      else if (d.recurrenceRule === 'monthly') { current = new Date(current); current.setMonth(current.getMonth() + 1) }
      if (current > endDate) break
      children.push({
        org_id: orgId, client_id: clientId,
        technician_id: d.technicianId ?? null,
        service: d.service, service_icon: d.serviceIcon, service_color: d.serviceColor,
        scheduled_at: current.toISOString(), status: 'scheduled', address: d.address,
        prep_checklist: d.prepChecklist, duration_minutes: d.durationMinutes,
        recurrence_rule: d.recurrenceRule, recurrence_end_date: d.recurrenceEndDate ?? null,
        auto_reminder: d.autoReminder,
        price_cents: d.priceCents ?? null,
        parent_appointment_id: appt.id,
      })
    }
    if (children.length > 0) {
      await supabase.from('appointments').insert(children)
      recurringCount = children.length
    }
  }

  // Fire-and-forget notifications to the assigned technician
  if (d.technicianId && appt) {
    try {
      const { data: tech } = await supabase
        .from('technicians')
        .select('phone, profiles ( expo_push_token )')
        .eq('id', d.technicianId)
        .maybeSingle()

      const techProfile = (tech?.profiles as unknown as { expo_push_token: string | null } | null)

      // 1. Push notification
      if (techProfile?.expo_push_token) {
        const scheduledAt = new Date(d.scheduledAt)
        const scheduledTime = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tmrw = new Date(today); tmrw.setDate(today.getDate() + 1)
        const apptDay = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())
        const scheduledDate =
          apptDay.getTime() === today.getTime() ? 'Today' :
          apptDay.getTime() === tmrw.getTime() ? 'Tomorrow' :
          scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        await notifyTechnicianAssigned({
          pushToken: techProfile.expo_push_token,
          customerName: d.customerName,
          service: d.service,
          scheduledDate,
          scheduledTime,
          appointmentId: appt.id,
        })
      }

      // 2. SMS notification
      if (tech?.phone) {
        const scheduledAt = new Date(d.scheduledAt)
        const scheduledTime = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        const scheduledDate = new Date(d.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        await sendSMS({
          to: tech.phone,
          body: `New job assigned: ${d.service} for ${d.customerName} on ${scheduledDate} at ${scheduledTime}. Check your dashboard for details.`,
        }).catch(err => console.error('[SMS] Technician notify failed:', err))
      }
    } catch (notifErr) {
      // Notification failures must never block the response
      console.error('[Notif] Failed to notify technician:', notifErr)
    }
  }

  return NextResponse.json({ appointment: appt, recurringCount }, { status: 201 })
}
