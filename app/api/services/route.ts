import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fix: only get services for this user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build a portal price map as fallback for services with no main-catalog price.
  // This ensures the AddClientModal pre-populates prices from the booking portal
  // when the user has only configured pricing there.
  const portalPriceMap: Record<string, number> = {}
  const { data: bLink } = await supabase
    .from('booking_links')
    .select('id')
    .eq('org_id', profile.org_id)
    .maybeSingle()
  if (bLink) {
    const { data: bSvc } = await supabase
      .from('booking_services')
      .select('name, price_cents')
      .eq('booking_link_id', bLink.id)
    for (const s of bSvc ?? []) {
      if (typeof s.price_cents === 'number' && s.price_cents > 0) {
        portalPriceMap[s.name] = s.price_cents
      }
    }
  }

  const enriched = (data ?? []).map(s => ({
    ...s,
    price_cents: (typeof s.price_cents === 'number' && s.price_cents > 0)
      ? s.price_cents
      : (portalPriceMap[s.name] ?? 0),
  }))

  return NextResponse.json({ services: enriched })
}

const CreateServiceSchema = z.object({
  name:          z.string().min(1).max(80),
  icon:          z.string().default('🔧'),
  color:         z.string().default('blue'),
  prepTemplates: z.array(z.string()).default([]),
  priceCents:    z.number().int().min(0).default(0),
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
      price_cents: d.priceCents,
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
      price_cents: d.priceCents,
    })
  }

  return NextResponse.json({ service: data }, { status: 201 })
}
