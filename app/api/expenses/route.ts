import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ExpenseSchema = z.object({
  name:         z.string().min(1).max(200),
  amount_cents: z.number().int().min(0),
  category:     z.enum(['supplies', 'labor', 'overhead', 'other']),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:        z.string().max(500).optional(),
})

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()
  return data?.org_id ?? null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('expenses')
    .select('id, name, amount_cents, category, expense_date, notes, created_at')
    .eq('org_id', orgId)
    .order('expense_date', { ascending: false })

  if (from) query = query.gte('expense_date', from)
  if (to)   query = query.lte('expense_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = ExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed.data, org_id: orgId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data }, { status: 201 })
}
