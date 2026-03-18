import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getBookingLinkId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', userId).single()
  if (!profile?.org_id) return null
  const { data: link } = await supabase.from('booking_links').select('id').eq('org_id', profile.org_id).single()
  return link?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if ('name' in body) updates.name = body.name
  if ('icon' in body) updates.icon = body.icon
  if ('color' in body) updates.color = body.color
  if ('prepTemplates' in body) updates.prep_templates = body.prepTemplates

  // Capture old name before update so we can match the booking_services row by name
  const oldName = updates.name
    ? (await supabase.from('services').select('name').eq('id', id).single()).data?.name
    : null

  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sync name change to booking portal (match by old name within org's booking link)
  if (updates.name && oldName) {
    const linkId = await getBookingLinkId(supabase, user.id)
    if (linkId) {
      await supabase
        .from('booking_services')
        .update({ name: updates.name as string })
        .eq('booking_link_id', linkId)
        .eq('name', oldName)
    }
  }

  return NextResponse.json({ service: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch service name before deactivating so we can match the booking_services row
  const { data: svc } = await supabase.from('services').select('name').eq('id', id).single()

  const { error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sync deactivation to booking portal (match by name within org's booking link)
  if (svc?.name) {
    const linkId = await getBookingLinkId(supabase, user.id)
    if (linkId) {
      await supabase
        .from('booking_services')
        .update({ is_active: false })
        .eq('booking_link_id', linkId)
        .eq('name', svc.name)
    }
  }

  return NextResponse.json({ success: true })
}
