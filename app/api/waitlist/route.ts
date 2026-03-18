import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const WaitlistSchema = z.object({
  bookingLinkId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  customerAddress: z.string().optional().or(z.literal('')),
  serviceId: z.string().uuid().optional(),
  notes: z.string().optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json().catch(() => null)
  const parsed = WaitlistSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { bookingLinkId, ...data } = parsed.data

  // Get org_id from booking_link
  const { data: link, error: linkError } = await supabase
    .from('booking_links')
    .select('org_id')
    .eq('id', bookingLinkId)
    .single()

  if (linkError || !link) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  // Resolve booking_service_id to internal service_id if provided
  let internalServiceId = null
  if (data.serviceId) {
    const { data: svc } = await supabase
      .from('booking_services')
      .select('service_id')
      .eq('id', data.serviceId)
      .single()
    internalServiceId = svc?.service_id || null
  }

  const { error } = await supabase.from('waitlist').insert({
    org_id: link.org_id,
    customer_name: data.customerName,
    customer_email: data.customerEmail || null,
    customer_phone: data.customerPhone || null,
    customer_address: data.customerAddress || null,
    service_id: internalServiceId,
    notes: data.notes || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('waitlist')
    .select(`
      *,
      service:services(name, icon, color)
    `)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ waitlist: data })
}
