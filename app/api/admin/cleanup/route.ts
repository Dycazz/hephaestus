import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PROTECTED_EMAIL = 'gavindycus@gmail.com'

/**
 * POST /api/admin/cleanup
 *
 * Deletes trial organizations matching either rule:
 *   Rule A — expired trial + zero appointments ever
 *   Rule B — 90+ days old + no appointments in the last 30 days
 *
 * Always excludes the protected admin email.
 * Returns { deleted, skipped } counts.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createClient(true)
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Rule A: expired trial orgs (trial_ends_at < now)
  const { data: expiredOrgs, error: expiredErr } = await admin
    .from('organizations')
    .select('id')
    .eq('plan', 'trial')
    .lt('trial_ends_at', now.toISOString())

  if (expiredErr) {
    return NextResponse.json({ error: expiredErr.message }, { status: 500 })
  }

  // Rule B: trial orgs created 90+ days ago
  const { data: oldOrgs, error: oldErr } = await admin
    .from('organizations')
    .select('id')
    .eq('plan', 'trial')
    .lt('created_at', ninetyDaysAgo)

  if (oldErr) {
    return NextResponse.json({ error: oldErr.message }, { status: 500 })
  }

  // Deduplicate org IDs across both rules
  const orgIdSet = new Set([
    ...(expiredOrgs ?? []).map(o => o.id),
    ...(oldOrgs ?? []).map(o => o.id),
  ])

  let deleted = 0
  let skipped = 0

  for (const orgId of orgIdSet) {
    // Determine which rules apply
    const isExpired = (expiredOrgs ?? []).some(o => o.id === orgId)
    const isOld = (oldOrgs ?? []).some(o => o.id === orgId)

    if (isExpired) {
      // Rule A: skip if org has ANY appointments ever
      const { count: totalAppts } = await admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)

      if (totalAppts && totalAppts > 0) {
        // Check Rule B as fallback before skipping
        if (!isOld) { skipped++; continue }
        // Falls through to Rule B check below
      } else {
        // No appointments at all — eligible via Rule A, proceed to delete
        if (await isProtected(admin, orgId)) { skipped++; continue }
        await deleteOrg(admin, orgId)
        deleted++
        continue
      }
    }

    if (isOld) {
      // Rule B: skip if org has any appointment in the last 30 days
      const { count: recentAppts } = await admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', thirtyDaysAgo)

      if (recentAppts && recentAppts > 0) {
        skipped++
        continue
      }

      if (await isProtected(admin, orgId)) { skipped++; continue }
      await deleteOrg(admin, orgId)
      deleted++
    }
  }

  return NextResponse.json({ deleted, skipped })
}

async function isProtected(admin: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .single()

  if (!ownerProfile) return false

  const { data: authUser } = await admin.auth.admin.getUserById(ownerProfile.id)
  return authUser?.user?.email === PROTECTED_EMAIL
}

async function deleteOrg(admin: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)

  await admin.from('organizations').delete().eq('id', orgId)

  for (const p of profiles ?? []) {
    await admin.auth.admin.deleteUser(p.id).catch(() => {})
  }
}
