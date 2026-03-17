import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

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
    .select('id, name, business_name, slug, plan, review_url, twilio_phone_number, reminder_hours_before, created_at, stripe_customer_id, subscription_status, subscription_period_end, trial_ends_at')
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

  const updates: Record<string, string | number | null> = {}
  if ('businessName'        in body) updates.business_name         = body.businessName        || null
  if ('reviewUrl'           in body) updates.review_url            = body.reviewUrl           || null
  if ('twilioPhoneNumber'   in body) updates.twilio_phone_number   = body.twilioPhoneNumber   || null
  if ('reminderHoursBefore' in body) updates.reminder_hours_before = Number(body.reminderHoursBefore) || 24

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ org })
}

export async function DELETE(_request: NextRequest) {
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
    return NextResponse.json({ error: 'Only owners can delete the organization' }, { status: 403 })
  }

  const adminClient = await createClient(true)

  // Cancel active Stripe subscription if one exists
  const { data: org } = await adminClient
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', profile.org_id)
    .single()

  if (org?.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        status: 'active',
        limit: 5,
      })
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id)
      }
    } catch { /* non-fatal — proceed with deletion */ }
  }

  // Collect member IDs before cascade deletion removes profiles
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id')
    .eq('org_id', profile.org_id)

  // Delete org — cascades to profiles, appointments, clients, technicians, services, sms_messages, invitations
  const { error: deleteError } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', profile.org_id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Remove auth users
  for (const p of profiles ?? []) {
    await adminClient.auth.admin.deleteUser(p.id).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
