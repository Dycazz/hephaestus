/**
 * POST /api/estimates/[id]/decline — Manually decline an estimate (internal use)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data, error } = await supabase
    .from('estimates')
    .update({
      status:      'declined',
      declined_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['draft', 'sent', 'viewed'])  // only reasonable to decline from these states
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Estimate not found or cannot be declined' }, { status: 404 })

  return NextResponse.json({ estimate: data })
}
