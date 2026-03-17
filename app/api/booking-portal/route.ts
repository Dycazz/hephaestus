import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const linkSchema = z.object({
  business_name: z.string().min(1).max(255),
  business_phone: z.string().max(50).nullable().optional(),
  accent_color: z.string().max(20).optional(),
  background_color: z.string().max(20).optional(),
  text_color: z.string().max(20).optional(),
  show_pricing: z.boolean().optional(),
  require_customer_email: z.boolean().optional(),
  require_customer_phone: z.boolean().optional(),
  booking_window_days: z.number().int().min(1).max(365).optional(),
  slot_duration_minutes: z.number().int().min(15).max(480).optional(),
  is_active: z.boolean().optional(),
})

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  return profile?.org_id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: link } = await supabase
    .from('booking_links')
    .select('*')
    .eq('org_id', orgId)
    .single()

  return NextResponse.json({ portal: link ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owners can create booking links
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('org_id', orgId)
    .single()
  if (profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can manage the booking portal' }, { status: 403 })
  }

  // Check one doesn't already exist
  const { data: existing } = await supabase
    .from('booking_links')
    .select('id')
    .eq('org_id', orgId)
    .single()
  if (existing) {
    return NextResponse.json({ error: 'Booking link already exists — use PATCH to update' }, { status: 409 })
  }

  const body = await request.json()
  const parsed = linkSchema.parse(body)

  // Use org slug as the portal slug
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', orgId)
    .single()

  const { data: link, error } = await supabase
    .from('booking_links')
    .insert({
      org_id: orgId,
      slug: org?.slug ?? orgId,
      ...parsed,
    })
    .select()
    .single()

  if (error) {
    console.error('Create booking link error:', error)
    return NextResponse.json({ error: 'Failed to create booking link' }, { status: 500 })
  }

  return NextResponse.json({ portal: link })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = linkSchema.parse(body)

  const { data: link, error } = await supabase
    .from('booking_links')
    .update(parsed)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Update booking link error:', error)
    return NextResponse.json({ error: 'Failed to update booking link' }, { status: 500 })
  }

  return NextResponse.json({ portal: link })
}
