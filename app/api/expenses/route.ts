import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const RECURRENCE_VALUES = ['none', 'weekly', 'monthly', 'annually'] as const
type Recurrence = typeof RECURRENCE_VALUES[number]

const ExpenseSchema = z.object({
  name:         z.string().min(1).max(200),
  amount_cents: z.number().int().min(0),
  category:     z.enum(['supplies', 'labor', 'overhead', 'other']),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:        z.string().max(500).optional(),
  recurrence:   z.enum(RECURRENCE_VALUES).optional().default('none'),
})

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .single()
  return data?.org_id ?? null
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Project recurring expense into individual instances within a date range ──
interface ExpenseRow {
  id: string
  name: string
  amount_cents: number
  category: string
  expense_date: string
  notes: string | null
  recurrence: string
  created_at: string
  baseId?: string
}

function projectRecurring(exp: ExpenseRow, fromDate: Date | null, toDate: Date | null): ExpenseRow[] {
  const results: ExpenseRow[] = []
  const startDate = new Date(exp.expense_date + 'T00:00:00')
  const endDate   = toDate ?? new Date()

  if (startDate > endDate) return results

  let cur     = new Date(startDate)
  let safety  = 0

  while (cur <= endDate && safety < 500) {
    const inRange = (!fromDate || cur >= fromDate)
    if (inRange) {
      results.push({
        ...exp,
        id:           `${exp.id}_${toDateStr(cur)}`,   // synthetic ID for React key
        baseId:       exp.id,                           // original record ID for deletion
        expense_date: toDateStr(cur),
      })
    }

    // Advance to the next occurrence
    const next = new Date(cur)
    if (exp.recurrence === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else if (exp.recurrence === 'monthly') {
      next.setMonth(next.getMonth() + 1)
    } else if (exp.recurrence === 'annually') {
      next.setFullYear(next.getFullYear() + 1)
    } else {
      break
    }
    cur = next
    safety++
  }

  return results
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

  const fromDate = from ? new Date(from + 'T00:00:00') : null
  const toDate   = to   ? new Date(to   + 'T23:59:59') : null

  // Fetch ALL expenses so we can project recurring ones into the range
  const { data, error } = await supabase
    .from('expenses')
    .select('id, name, amount_cents, category, expense_date, notes, recurrence, created_at')
    .eq('org_id', orgId)
    .order('expense_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: ExpenseRow[] = []

  for (const raw of data ?? []) {
    const exp: ExpenseRow = {
      id:           raw.id,
      name:         raw.name,
      amount_cents: raw.amount_cents,
      category:     raw.category,
      expense_date: raw.expense_date,
      notes:        raw.notes,
      recurrence:   (raw as Record<string, unknown>).recurrence as string ?? 'none',
      created_at:   raw.created_at,
    }

    if (!exp.recurrence || exp.recurrence === 'none') {
      // Non-recurring: simple date-range filter
      const d = new Date(exp.expense_date + 'T00:00:00')
      if (fromDate && d < fromDate) continue
      if (toDate   && d > toDate  ) continue
      results.push(exp)
    } else {
      // Recurring: project all instances that fall within the date range
      const instances = projectRecurring(exp, fromDate, toDate)
      results.push(...instances)
    }
  }

  // Sort by expense_date descending
  results.sort((a, b) => b.expense_date.localeCompare(a.expense_date))

  return NextResponse.json({ expenses: results })
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
    .insert({
      ...parsed.data,
      recurrence: parsed.data.recurrence as Recurrence,
      org_id: orgId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data }, { status: 201 })
}
