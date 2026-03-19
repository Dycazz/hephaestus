/**
 * PATCH  /api/tax-rates/[id]  — Update a tax rate
 * DELETE /api/tax-rates/[id]  — Delete a tax rate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const UpdateTaxRateSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  rate_percent: z.number().min(0).max(100).optional(),
  is_default:   z.boolean().optional(),
})

async function getOrgAndRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', userId)
    .single()
  return data
}

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrgAndRole(supabase, user.id)
  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = UpdateTaxRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const d = parsed.data

  // If setting as default, clear existing defaults
  if (d.is_default) {
    await supabase
      .from('tax_rates')
      .update({ is_default: false })
      .eq('org_id', profile.org_id)
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('tax_rates')
    .update({ ...d, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tax_rate: data })
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getOrgAndRole(supabase, user.id)
  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('tax_rates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
