import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data ?? [] })
}

const CreateServiceSchema = z.object({
  name:          z.string().min(1).max(80),
  icon:          z.string().default('🔧'),
  color:         z.string().default('blue'),
  prepTemplates: z.array(z.string()).default([]),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = CreateServiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const d = parsed.data
  const { data, error } = await supabase
    .from('services')
    .insert({
      org_id: profile.org_id,
      name: d.name,
      icon: d.icon,
      color: d.color,
      prep_templates: d.prepTemplates,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync to booking portal if one exists for this org
  const { data: link } = await supabase
    .from('booking_links')
    .select('id')
    .eq('org_id', profile.org_id)
    .single()
  if (link?.id) {
    await supabase.from('booking_services').insert({
      booking_link_id: link.id,
      name: d.name,
    })
  }

  return NextResponse.json({ service: data }, { status: 201 })
}
