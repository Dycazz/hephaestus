import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgPlanAccess } from '@/lib/plan-access'

/**
 * GET /api/auth/check-access
 *
 * Called immediately after login to verify the authenticated user's org
 * has an active plan. Signs are checked server-side so the result can't
 * be spoofed by the client.
 *
 * Returns:
 *   { allowed: true }
 *   { allowed: false, reason: string }
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ allowed: false, reason: 'Not authenticated.' }, { status: 401 })
  }

  // Get the user's org via their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ allowed: false, reason: 'No organization found for this account.' }, { status: 403 })
  }

  // Use service role to bypass RLS for the plan check
  const admin = await createClient(true)
  const access = await getOrgPlanAccess(profile.org_id, admin)

  const clearAuthCookies = (res: NextResponse) => {
    ;['heph_auth', 'sb-access-token', 'sb-refresh-token'].forEach((name) => {
      res.cookies.set(name, '', { path: '/', maxAge: 0 })
    })
    return res
  }

  if (access.suspended) {
    return clearAuthCookies(NextResponse.json({
      allowed: false,
      reason: 'Your account has been suspended. Please contact support.',
    }))
  }

  if (access.plan === 'trial') {
    return clearAuthCookies(NextResponse.json({
      allowed: false,
      reason: 'A subscription is required. Please subscribe at hephaestus.work to continue.',
    }))
  }

  if (!access.active) {
    return clearAuthCookies(NextResponse.json({
      allowed: false,
      reason: 'Your subscription is inactive. Please update your billing at hephaestus.work.',
    }))
  }

  // Set a session-only marker cookie so middleware can confirm this session
  // came through the new login flow (no maxAge = expires when browser closes)
  const res = NextResponse.json({ allowed: true })
  res.cookies.set('heph_auth', '1', { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
