import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Default availability applied to days not found in DB:
// Mon–Fri working 08:00–17:00, Sat–Sun off.
const DEFAULT_AVAILABILITY = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: '08:00',
  endTime: '17:00',
  isWorking: i >= 1 && i <= 5,  // Mon(1)–Fri(5) = true
}))

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: technicianId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('technician_availability')
    .select('*')
    .eq('technician_id', technicianId)

  // Merge DB rows with defaults so we always return 7 entries
  const availability = DEFAULT_AVAILABILITY.map(def => {
    const row = rows?.find(r => r.day_of_week === def.dayOfWeek)
    if (!row) return { ...def, id: '', technicianId, orgId: '' }
    return {
      id: row.id,
      orgId: row.org_id,
      technicianId: row.technician_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isWorking: row.is_working,
    }
  })

  return NextResponse.json({ availability })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: technicianId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected array' }, { status: 400 })

  // Upsert all 7 days
  const rows = body.map((entry: {
    dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean
  }) => ({
    org_id: profile.org_id,
    technician_id: technicianId,
    day_of_week: entry.dayOfWeek,
    start_time: entry.startTime,
    end_time: entry.endTime,
    is_working: entry.isWorking,
  }))

  const { error } = await supabase
    .from('technician_availability')
    .upsert(rows, { onConflict: 'technician_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
