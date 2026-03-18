import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const CreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['dispatcher', 'viewer', 'technician']),
  technicianId: z.string().uuid().optional().nullable(),
})

// GET /api/invitations — list pending invitations for the current user's org
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, token, created_at, expires_at, accepted_at, technician_id')
    .eq('org_id', profile.org_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitations: data ?? [] })
}

// POST /api/invitations — create a new invitation (owner/dispatcher only)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { email, role, technicianId } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // Check for already-pending invite for this email in the same org
  const { data: existing } = await supabase
    .from('invitations')
    .select('id')
    .eq('org_id', profile.org_id)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email' },
      { status: 409 }
    )
  }

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      org_id: profile.org_id,
      email: normalizedEmail,
      role,
      technician_id: technicianId ?? null,
      invited_by: user.id,
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitation }, { status: 201 })
}
