import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const serviceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(480),
  price_cents: z.number().int().min(0),
  display_order: z.number().int().optional(),
})

async function getBookingLinkId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!profile?.org_id) return null
  const { data: link } = await supabase
    .from('booking_links')
    .select('id')
    .eq('org_id', profile.org_id)
    .single()
  return link?.id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const linkId = await getBookingLinkId(supabase)
  if (!linkId) return NextResponse.json({ services: [] })

  const { data: services } = await supabase
    .from('booking_services')
    .select('*')
    .eq('booking_link_id', linkId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return NextResponse.json({ services: services ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const linkId = await getBookingLinkId(supabase)
  if (!linkId) return NextResponse.json({ error: 'No booking portal found — create one first' }, { status: 404 })

  const body = await request.json()
  const parsed = serviceSchema.parse(body)

  const { data: service, error } = await supabase
    .from('booking_services')
    .insert({ ...parsed, booking_link_id: linkId })
    .select()
    .single()

  if (error) {
    console.error('Create booking service error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }

  return NextResponse.json({ service })
}
