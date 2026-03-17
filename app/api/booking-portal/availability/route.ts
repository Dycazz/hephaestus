import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const slotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

const putSchema = z.object({
  slots: z.array(slotSchema),
})

async function getOrgAndLinkId(supabase: Awaited<ReturnType<typeof createClient>>) {
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
    .select('id, org_id')
    .eq('org_id', profile.org_id)
    .single()
  return link ?? null
}

export async function GET() {
  const supabase = await createClient()
  const link = await getOrgAndLinkId(supabase)
  if (!link) return NextResponse.json({ availability: [] })

  const { data: availability } = await supabase
    .from('booking_availability')
    .select('*')
    .eq('booking_link_id', link.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })

  return NextResponse.json({ availability: availability ?? [] })
}

// PUT replaces all availability slots for this org's booking link
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const link = await getOrgAndLinkId(supabase)
  if (!link) return NextResponse.json({ error: 'No booking portal found' }, { status: 404 })

  const body = await request.json()
  const { slots } = putSchema.parse(body)

  // Delete existing slots
  await supabase
    .from('booking_availability')
    .delete()
    .eq('booking_link_id', link.id)

  if (slots.length === 0) {
    return NextResponse.json({ availability: [] })
  }

  // Insert new slots
  const { data: availability, error } = await supabase
    .from('booking_availability')
    .insert(slots.map(s => ({ ...s, booking_link_id: link.id, is_active: true })))
    .select()

  if (error) {
    console.error('Save availability error:', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }

  return NextResponse.json({ availability })
}
