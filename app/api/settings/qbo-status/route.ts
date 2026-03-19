/**
 * GET /api/settings/qbo-status — Return current QBO connection status for the org
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ connection: null })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ connection: null })
  }

  const { data: conn } = await supabase
    .from('qbo_connections')
    .select('company_name, last_synced_at, connected_at')
    .eq('org_id', profile.org_id)
    .single()

  return NextResponse.json({ connection: conn ?? null })
}
