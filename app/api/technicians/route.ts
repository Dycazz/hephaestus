import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ technicians: data })
}

const CreateTechSchema = z.object({
  name:     z.string().min(1).max(100),
  initials: z.string().max(3).optional(),
  color:    z.string().optional().default('blue'),
  phone:    z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateTechSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // ── Plan access check (TODO: re-enable when Stripe integration is live) ──
  // ─────────────────────────────────────────────────────────────────────────

  const d = parsed.data
  const initials = d.initials ?? d.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const { data, error } = await supabase
    .from('technicians')
    .insert({ org_id: profile.org_id, name: d.name, initials, color: d.color, phone: d.phone ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ technician: data }, { status: 201 })
}
