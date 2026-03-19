/**
 * GET /api/qbo/connect — Redirect user to QuickBooks Online OAuth authorization URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildQBOAuthUrl, getQBOConfig } from '@/lib/qbo'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

  const config = getQBOConfig()
  if (!config.clientId || !config.redirectUri) {
    return NextResponse.json(
      { error: 'QuickBooks integration not configured. Please set QBO_CLIENT_ID and QBO_REDIRECT_URI.' },
      { status: 503 }
    )
  }

  // Use org_id as state to identify which org is connecting on callback
  const state = profile.org_id
  const authUrl = buildQBOAuthUrl(state)

  // Check for API-only mode (used in Settings UI fetch)
  const { searchParams } = new URL(request.url)
  if (searchParams.get('url_only') === '1') {
    return NextResponse.json({ url: authUrl })
  }

  return NextResponse.redirect(authUrl)
}
