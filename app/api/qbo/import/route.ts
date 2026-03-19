/**
 * POST /api/qbo/import — Import QBO customers into the clients table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importQBOCustomers } from '@/lib/qbo-sync'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.org_id

  // Verify QBO is connected
  const serviceClient = await createClient(true)
  const { data: conn } = await serviceClient
    .from('qbo_connections')
    .select('id')
    .eq('org_id', orgId)
    .single()

  if (!conn) {
    return NextResponse.json({ error: 'QuickBooks is not connected.' }, { status: 422 })
  }

  const results = await importQBOCustomers(orgId)

  return NextResponse.json({ success: true, ...results })
}
