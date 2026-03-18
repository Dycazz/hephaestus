import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sync name change to linked booking service
  if (updates.name) {
    await supabase
      .from('booking_services')
      .update({ name: updates.name })
      .eq('service_id', id)
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

  const { error } = await supabase
    .from('services')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Sync deactivation to linked booking service
  await supabase
    .from('booking_services')
    .update({ is_active: false })
    .eq('service_id', id)

  return NextResponse.json({ success: true })
}
