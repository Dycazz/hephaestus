/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for a subscription upgrade.
 * Returns { url } — the client redirects to it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getStripe, PAID_PLANS, type PaidPlanKey } from '@/lib/stripe'

const Schema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owners can manage billing
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only org owners can manage billing' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const planKey = parsed.data.plan as PaidPlanKey
  const planConfig = PAID_PLANS[planKey]

  // Fetch org to get/set stripe_customer_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id, business_name, stripe_customer_id, subscription_status, stripe_subscription_id')
    .eq('id', profile.org_id)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Prevent duplicate active subscriptions
  if (org.subscription_status === 'active' && org.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'You already have an active subscription. Use the billing portal to change your plan.' },
      { status: 409 }
    )
  }

  const stripe = getStripe()

  // Get the user's email from Supabase auth
  const { data: authUser } = await supabase.auth.getUser()
  const email = authUser.user?.email

  // Upsert Stripe customer
  let stripeCustomerId = org.stripe_customer_id
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      name: org.business_name ?? undefined,
      metadata: { org_id: org.id },
    })
    stripeCustomerId = customer.id

    // Persist customer ID immediately
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', org.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hephaestus.work'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [
      {
        price: planConfig.getPriceId(),
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/settings?tab=plan&checkout=success`,
    cancel_url:  `${appUrl}/settings?tab=plan&checkout=cancelled`,
    metadata: {
      org_id: org.id,
      plan:   planKey,
    },
    subscription_data: {
      metadata: {
        org_id: org.id,
        plan:   planKey,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
