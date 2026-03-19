import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PatchSchema = z.object({
  role: z.enum(['owner', 'dispatcher', 'viewer', 'technician']),
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

/**
 * PATCH /api/admin/orgs/[id]/members/[memberId]
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  const { id, memberId } = await params
  const { admin, error, status } = await assertAdmin()
  if (!admin) return NextResponse.json({ error }, { status })

  const body = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { data, error: updateError } = await admin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', memberId)
    .eq('org_id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

/**
 * DELETE /api/admin/orgs/[id]/members/[memberId]
 * Remove a member from the organization entirely
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string, memberId: string }> }
) {
  const { id, memberId } = await params
  const { admin, error, status } = await assertAdmin()
  if (!admin) return NextResponse.json({ error }, { status })

  // Verify the member belongs to the org
  const { data: profile } = await admin
    .from('profiles')
    .select('id, org_id')
    .eq('id', memberId)
    .single()

  if (!profile || profile.org_id !== id) {
    return NextResponse.json({ error: 'Member not found in this org' }, { status: 404 })
  }

  // Delete from auth.users (this cascades to profiles)
  const { error: deleteError } = await admin.auth.admin.deleteUser(memberId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
