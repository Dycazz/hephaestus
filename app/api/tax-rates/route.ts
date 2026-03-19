/**
 * GET  /api/tax-rates  — List tax rates for the current org
 * POST /api/tax-rates  — Create a new tax rate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CreateTaxRateSchema = z.object({
  name:         z.string().min(1).max(100),
  rate_percent: z.number().min(0).max(100),
  is_default:   z.boolean().optional().default(false),
})

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tax_rates: data })
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = CreateTaxRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const d = parsed.data

  // If setting as default, clear any existing defaults first
  if (d.is_default) {
    await supabase
      .from('tax_rates')
      .update({ is_default: false })
      .eq('org_id', profile.org_id)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('tax_rates')
    .insert({
      org_id:       profile.org_id,
      name:         d.name,
      rate_percent: d.rate_percent,
      is_default:   d.is_default,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tax_rate: data }, { status: 201 })
}
