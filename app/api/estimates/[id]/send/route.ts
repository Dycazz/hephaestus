/**
 * POST /api/estimates/[id]/send — Send estimate to client via email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEstimateEmail } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
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

  // Fetch estimate with client
  const { data: estimate, error: fetchError } = await supabase
    .from('estimates')
    .select('*, clients ( id, name, email )')
    .eq('id', id)
    .single()

  if (fetchError || !estimate) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }
  if (!['draft', 'sent'].includes(estimate.status)) {
    return NextResponse.json(
      { error: 'Can only send draft or previously-sent estimates.' },
      { status: 422 }
    )
  }

  // Fetch org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single()

  const businessName = org?.name ?? 'Your Service Provider'

  // Derive app base URL
  let appUrl: string
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    appUrl = cfCtx?.env?.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://hephaestus.work'
  } catch {
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hephaestus.work'
  }

  const viewUrl = `${appUrl}/estimates/view/${estimate.public_token}`

  // Send email if client has email
  if (estimate.clients?.email) {
    await sendEstimateEmail({
      to:             estimate.clients.email,
      clientName:     estimate.clients.name,
      estimateNumber: estimate.estimate_number,
      totalCents:     estimate.total_cents,
      expiryDate:     estimate.expiry_date ?? null,
      viewUrl,
      businessName,
    })
  }

  // Update status to sent
  const { data, error } = await supabase
    .from('estimates')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ estimate: data, viewUrl })
}
