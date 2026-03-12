import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/orgs
 *
 * Returns all organizations with aggregated stats.
 * Requires is_admin = true on the requesting user's profile.
 * Uses service role to bypass RLS across all orgs.
 */
export async function GET(_request: NextRequest) {
  // Verify admin — use anon client to get the authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check is_admin with service role (bypasses RLS to read any profile)
  const admin = await createClient(true)
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all orgs
  const { data: orgs, error: orgsError } = await admin
    .from('organizations')
    .select('id, name, slug, business_name, plan, trial_ends_at, suspended_at, twilio_phone_number, created_at')
    .order('created_at', { ascending: false })

  if (orgsError || !orgs) {
    return NextResponse.json({ error: orgsError?.message ?? 'Failed to fetch orgs' }, { status: 500 })
  }

  // Fetch member counts per org
  const { data: memberCounts } = await admin
    .from('profiles')
    .select('org_id')

  // Fetch appointment counts (total + last 30 days) per org
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: allAppts } = await admin
    .from('appointments')
    .select('org_id, created_at')

  // Aggregate counts
  const memberCountMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    memberCountMap[m.org_id] = (memberCountMap[m.org_id] ?? 0) + 1
  }

  const apptTotalMap: Record<string, number> = {}
  const appt30dMap: Record<string, number> = {}
  for (const a of allAppts ?? []) {
    apptTotalMap[a.org_id] = (apptTotalMap[a.org_id] ?? 0) + 1
    if (new Date(a.created_at) >= thirtyDaysAgo) {
      appt30dMap[a.org_id] = (appt30dMap[a.org_id] ?? 0) + 1
    }
  }

  const result = orgs.map(org => ({
    ...org,
    member_count: memberCountMap[org.id] ?? 0,
    appt_count_total: apptTotalMap[org.id] ?? 0,
    appt_count_30d: appt30dMap[org.id] ?? 0,
    has_twilio: !!org.twilio_phone_number,
  }))

  return NextResponse.json({ orgs: result })
}
