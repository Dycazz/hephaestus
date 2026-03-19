/**
 * GET /api/qbo/callback — Handle QBO OAuth callback, exchange code for tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQBOTokens, qboRequest } from '@/lib/qbo'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code     = searchParams.get('code')
  const state    = searchParams.get('state')     // org_id
  const realmId  = searchParams.get('realmId')   // QBO company ID
  const errorMsg = searchParams.get('error')

  // QBO denied access
  if (errorMsg) {
    return NextResponse.redirect('/settings?qbo_error=' + encodeURIComponent(errorMsg))
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect('/settings?qbo_error=missing_params')
  }

  // Verify the user is authenticated and belongs to the org in state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.org_id !== state || !['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.redirect('/settings?qbo_error=org_mismatch')
  }

  try {
    // Exchange code for tokens
    const tokens = await getQBOTokens(code)
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const serviceClient = await createClient(true)

    // Fetch company name from QBO
    let companyName: string | null = null
    try {
      const orgRes = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
          },
        }
      )
      if (orgRes.ok) {
        const data = await orgRes.json() as { CompanyInfo?: { CompanyName?: string } }
        companyName = data.CompanyInfo?.CompanyName ?? null
      }
    } catch {
      // Non-fatal: company name is cosmetic
    }

    // Upsert the QBO connection (one per org)
    await serviceClient
      .from('qbo_connections')
      .upsert({
        org_id:           state,
        realm_id:         realmId,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        scope:            tokens.token_type,
        company_name:     companyName,
        connected_at:     new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'org_id' })

    return NextResponse.redirect('/settings?qbo_connected=1')
  } catch (err) {
    console.error('[QBO] Callback error:', err)
    return NextResponse.redirect('/settings?qbo_error=token_exchange_failed')
  }
}
