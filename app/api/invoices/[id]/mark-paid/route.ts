/**
 * POST /api/invoices/[id]/mark-paid
 *
 * Manually marks an invoice as paid (cash, check, or other).
 * Body: { payment_method: 'cash' | 'check' | 'other' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  payment_method: z.enum(['cash', 'check', 'other']),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'dispatcher'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'payment_method must be cash, check, or other' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (existing.status === 'paid') {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 409 })
  }
  if (existing.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot mark a cancelled invoice as paid' }, { status: 409 })
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      status:         'paid',
      paid_at:        new Date().toISOString(),
      payment_method: parsed.data.payment_method,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoice })
}
