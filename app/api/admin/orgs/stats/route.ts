import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Top-level stats for the admin global dashboard
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = await createClient(true)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 1. Total Organizations
  const { count: totalOrgs, error: orgErr } = await adminClient
    .from('organizations')
    .select('id', { count: 'exact', head: true })

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

  // 2. Active Trials
  const now = new Date().toISOString()
  const { count: activeTrials } = await adminClient
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('plan', 'trial')
    .gt('trial_ends_at', now)

  // 3. Total Members
  const { count: totalMembers } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // 4. Appointments last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: recentAppts } = await adminClient
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())

  return NextResponse.json({
    totalOrgs: totalOrgs ?? 0,
    activeTrials: activeTrials ?? 0,
    totalMembers: totalMembers ?? 0,
    recentAppts: recentAppts ?? 0,
  })
}
