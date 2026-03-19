import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PROTECTED_EMAIL = 'gavindycus@gmail.com'

/**
 * POST /api/admin/cleanup
 *
 * Deletes organizations that:
 *   - Are on the trial plan with an expired trial (trial_ends_at < now)
 *   - Have zero appointments ever
 *   - Are not owned by the protected admin email
 *
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

  // Find all expired trial orgs
  const { data: expiredOrgs, error: orgsError } = await admin
    .from('organizations')
    .select('id')
    .eq('plan', 'trial')
    .lt('trial_ends_at', new Date().toISOString())

  if (orgsError) {
    return NextResponse.json({ error: orgsError.message }, { status: 500 })
  }

  let deleted = 0
  let skipped = 0

  for (const org of expiredOrgs ?? []) {
    // Skip if org has any appointments
    const { count: apptCount } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)

    if (apptCount && apptCount > 0) {
      skipped++
      continue
    }

    // Find the owner profile
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', org.id)
      .eq('role', 'owner')
      .single()

    if (ownerProfile) {
      const { data: authUser } = await admin.auth.admin.getUserById(ownerProfile.id)
      if (authUser?.user?.email === PROTECTED_EMAIL) {
        skipped++
        continue
      }
    }

    // Collect all member IDs before cascade
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', org.id)

    // Delete org (cascades to all related tables)
    const { error: deleteError } = await admin
      .from('organizations')
      .delete()
      .eq('id', org.id)

    if (deleteError) {
      skipped++
      continue
    }

    // Remove auth users
    for (const p of profiles ?? []) {
      await admin.auth.admin.deleteUser(p.id).catch(() => {})
    }

    deleted++
  }

  return NextResponse.json({ deleted, skipped })
}
