import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, business_name, slug, plan, review_url, twilio_phone_number, created_at, stripe_customer_id, subscription_status, subscription_period_end, trial_ends_at')
    .eq('id', profile.org_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ org, role: profile.role })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can update org settings' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, string | null> = {}
  if ('businessName' in body) updates.business_name = body.businessName || null
  if ('reviewUrl' in body) updates.review_url = body.reviewUrl || null
  if ('twilioPhoneNumber' in body) updates.twilio_phone_number = body.twilioPhoneNumber || null

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ org })
}
