import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PostSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['owner', 'dispatcher', 'viewer', 'technician']).default('dispatcher'),
  full_name: z.string().optional(),
})

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { admin: null, error: 'Unauthorized', status: 401 }

  const adminClient = await createClient(true)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { admin: null, error: 'Forbidden', status: 403 }
  return { admin: adminClient, error: null, status: 200 }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { admin, error, status } = await assertAdmin()
  if (!admin) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  // Verify org exists
  const { data: org } = await admin.from('organizations').select('id').eq('id', id).single()
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Create user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
  }

  // Update profile with org and role
  // (Assuming there's a trigger that creates the profile, we just need to update it)
  // If there's no trigger, we might need to wait or insert manually. Let's try update, and fallback to upsert.
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      org_id: id,
      role: parsed.data.role,
      full_name: parsed.data.full_name || null,
    })

  if (profileError) {
    // Attempt rollback
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ member: { id: authData.user.id, email: parsed.data.email, role: parsed.data.role } })
}
