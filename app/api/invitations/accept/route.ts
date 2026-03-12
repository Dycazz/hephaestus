import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/invitations/accept?token=UUID
 *
 * Public endpoint — validates an invitation token and returns metadata
 * (org name, email, role) so the signup page can pre-fill fields and show
 * "You've been invited to join [Org]" before the user creates their account.
 *
 * Uses the service role key so unauthenticated visitors can read invite details.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  // Service role so unauthenticated visitors can validate
  const supabase = await createClient(true)

  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, email, role, accepted_at, expires_at, org_id, organizations(name)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  const orgs = invitation.organizations as { name: string } | { name: string }[] | null
  const orgName = Array.isArray(orgs) ? (orgs[0]?.name ?? 'your team') : (orgs?.name ?? 'your team')

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    orgName,
  })
}
