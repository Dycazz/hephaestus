/**
 * GET  /api/estimates/public/[token]  — Public estimate view (no auth required)
 * POST /api/estimates/public/[token]  — Accept or decline an estimate (no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyEstimateToken } from '@/lib/estimate-token'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string }> }

const ActionSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

async function getEstimateByToken(token: string) {
  // Service role bypasses RLS so this public route can read any estimate by token
  const serviceClient = await createClient(true)

  const { data, error } = await serviceClient
    .from('estimates')
    .select(`
      *,
      clients ( id, name, email, phone, address ),
      estimate_line_items ( * ),
      estimate_taxes ( * ),
      organizations ( id, name )
    `)
    .eq('public_token', token)
    .single()

  return { estimate: data, error, serviceClient }
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params

  const { estimate, error } = await getEstimateByToken(token)
  if (error || !estimate) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }

  // Verify HMAC token
  const valid = await verifyEstimateToken(estimate.id, token)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  // Mark as viewed if first time
  if (!estimate.viewed_at && estimate.status === 'sent') {
    const serviceClient = await createClient(true)
    await serviceClient
      .from('estimates')
      .update({ status: 'viewed', viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', estimate.id)

    estimate.status = 'viewed'
    estimate.viewed_at = new Date().toISOString()
  }

  // Don't expose the raw token or sensitive org data in the response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { public_token: _token, ...safeEstimate } = estimate

  return NextResponse.json({ estimate: safeEstimate })
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params

  const body = await request.json().catch(() => null)
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { estimate, error, serviceClient } = await getEstimateByToken(token)
  if (error || !estimate) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }

  // Verify HMAC token
  const valid = await verifyEstimateToken(estimate.id, token)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  // Check estimate is in a state where client can act
  if (!['sent', 'viewed'].includes(estimate.status)) {
    return NextResponse.json(
      { error: `This estimate has already been ${estimate.status}.` },
      { status: 422 }
    )
  }

  // Check expiry
  if (estimate.expiry_date) {
    const expiry = new Date(estimate.expiry_date + 'T23:59:59')
    if (expiry < new Date()) {
      await serviceClient
        .from('estimates')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', estimate.id)
      return NextResponse.json(
        { error: 'This estimate has expired.' },
        { status: 422 }
      )
    }
  }

  const { action } = parsed.data
  const now = new Date().toISOString()

  const updates =
    action === 'accept'
      ? { status: 'accepted', accepted_at: now, updated_at: now }
      : { status: 'declined', declined_at: now, updated_at: now }

  const { data, updateError } = await serviceClient
    .from('estimates')
    .update(updates)
    .eq('id', estimate.id)
    .select()
    .single()
    .then(r => ({ data: r.data, updateError: r.error }))

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    action,
    estimate: data,
  })
}
