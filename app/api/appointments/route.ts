import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')   // ISO date string to filter by day

  let query = supabase
    .from('appointments')
    .select(`
      *,
      clients ( id, name, phone, address ),
      technicians ( id, name, initials, color )
    `)
    .not('status', 'eq', 'cancelled')
    .order('scheduled_at', { ascending: true })

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

  // Get current user's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Upsert client record
  let clientId = d.clientId
  if (!clientId) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('phone', d.customerPhone)
      .maybeSingle()

    if (existing) {
      clientId = existing.id
    } else {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          org_id: profile.org_id,
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
      org_id: profile.org_id,
      client_id: clientId,
      technician_id: d.technicianId ?? null,
      service: d.service,
      service_icon: d.serviceIcon,
      service_color: d.serviceColor,
      scheduled_at: d.scheduledAt,
      status: 'scheduled',
      address: d.address,
      prep_checklist: d.prepChecklist,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointment: appt }, { status: 201 })
}
