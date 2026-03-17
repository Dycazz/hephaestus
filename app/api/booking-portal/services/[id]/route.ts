import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  price_cents: z.number().int().min(0).optional(),
  display_order: z.number().int().optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.parse(body)

  // Verify the service belongs to this org via booking_links
  const { data: service, error } = await supabase
    .from('booking_services')
    .update(parsed)
    .eq('id', id)
    .select('*, booking_links!inner(org_id)')
    .eq('booking_links.org_id', orgId)
    .single()

  if (error || !service) {
    return NextResponse.json({ error: 'Service not found or access denied' }, { status: 404 })
  }

  return NextResponse.json({ service })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete — verify ownership via booking_links
  const { error } = await supabase
    .from('booking_services')
    .update({ is_active: false })
    .eq('id', id)
    .eq('booking_link_id', supabase
      .from('booking_links')
      .select('id')
      .eq('org_id', orgId)
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
