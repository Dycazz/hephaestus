import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PLANS = ['trial', 'starter', 'pro', 'enterprise'] as const

const PatchSchema = z.object({
  plan: z.enum(PLANS).optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  suspended_at: z.string().datetime().nullable().optional(),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, admin: null, error: 'Unauthorized', status: 401 }

  const adminClient = await createClient(true)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { user: null, admin: null, error: 'Forbidden', status: 403 }
  return { user, admin: adminClient, error: null, status: 200 }
}

/**
 * GET /api/admin/orgs/[id]
 * Full org detail: org fields + members + last 10 appointments
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { admin, error, status } = await assertAdmin()
  if (!admin) return NextResponse.json({ error }, { status })

  // Org
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Org not found' }, { status: 404 })
  }

  // Members (join with auth.users for email via admin API)
  const { data: members } = await admin
    .from('profiles')
    .select('id, role, is_admin, expo_push_token, created_at, full_name')
    .eq('org_id', id)
    .order('created_at', { ascending: true })

  // Get emails for members from auth.users
  const memberIds = (members ?? []).map(m => m.id)
  const memberEmails: Record<string, string> = {}
  for (const uid of memberIds) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(uid)
      if (authUser?.user?.email) memberEmails[uid] = authUser.user.email
    } catch { /* skip */ }
  }

  const membersWithEmail = (members ?? []).map(m => ({
    ...m,
    email: memberEmails[m.id] ?? null,
  }))

  // Recent appointments (last 10)
  const { data: appointments } = await admin
    .from('appointments')
    .select('id, status, service, service_icon, scheduled_at, address, clients(name), technicians(name)')
    .eq('org_id', id)
    .order('scheduled_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ org, members: membersWithEmail, appointments: appointments ?? [] })
}

/**
 * PATCH /api/admin/orgs/[id]
 * Update plan, trial_ends_at, or suspended_at
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { admin, error, status } = await assertAdmin()
  if (!admin) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  if (parsed.data.plan !== undefined) updates.plan = parsed.data.plan
  if ('trial_ends_at' in parsed.data) updates.trial_ends_at = parsed.data.trial_ends_at ?? null
  if ('suspended_at' in parsed.data) updates.suspended_at = parsed.data.suspended_at ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: org, error: updateError } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select('id, name, business_name, plan, trial_ends_at, suspended_at')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ org })
}
