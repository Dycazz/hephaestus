/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler. Receives subscription lifecycle events and
 * keeps the organizations table in sync with Stripe's state.
 *
 * Events handled:
 *   checkout.session.completed       → activate subscription on new purchase
 *   customer.subscription.updated    → sync status + period end (handles upgrades/downgrades)
 *   customer.subscription.deleted    → revert plan to 'trial', clear subscription fields
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, getStripeWebhookSecret, priceIdToPlanKey } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 1. Verify webhook signature using raw body
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      getStripeWebhookSecret()
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed'
    console.error('[Stripe Webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 2. Use service role client to bypass RLS
  const supabase = await createClient(true)

  try {
    switch (event.type) {

      // ── New checkout completed ───────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const orgId = session.metadata?.org_id
        const planKey = session.metadata?.plan
        if (!orgId || !planKey) {
          console.error('[Stripe Webhook] checkout.session.completed missing metadata', session.id)
          break
        }

        // Retrieve full subscription to get period end
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        // period_end lives on the subscription item in Stripe v20+ API
        const periodEnd = subscription.items.data[0]?.current_period_end

        await supabase
          .from('organizations')
          .update({
            plan:                   planKey,
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_status:    subscription.status,
            subscription_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq('id', orgId)

        console.log(`[Stripe Webhook] Org ${orgId} activated ${planKey} plan`)
        break
      }

      // ── Subscription updated (upgrade, downgrade, renewal, past_due) ────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Determine plan from the first price item
        const priceId = subscription.items.data[0]?.price?.id
        const planKey = priceId ? priceIdToPlanKey(priceId) : null

        // period_end lives on the subscription item in Stripe v20+ API
        const itemPeriodEnd = subscription.items.data[0]?.current_period_end

        const updates: Record<string, string | null> = {
          subscription_status:    subscription.status,
          subscription_period_end: itemPeriodEnd
            ? new Date(itemPeriodEnd * 1000).toISOString()
            : null,
        }

        // Update plan key if we could resolve it
        if (planKey) {
          updates.plan = planKey
        }

        // If subscription is no longer active, revert to trial
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          updates.plan                   = 'trial'
          updates.stripe_subscription_id = null
          updates.subscription_status    = subscription.status
          updates.subscription_period_end = null
        }

        // Find the org by subscription ID
        const { data: org } = await supabase
          .from('organizations')
          .select('id, plan')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (org) {
          await supabase
            .from('organizations')
            .update(updates)
            .eq('id', org.id)

          console.log(`[Stripe Webhook] Org ${org.id} subscription updated → ${updates.plan ?? org.plan} (${subscription.status})`)
        } else {
          console.warn(`[Stripe Webhook] No org found for subscription ${subscription.id}`)
        }
        break
      }

      // ── Subscription deleted (cancelled) ────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (org) {
          await supabase
            .from('organizations')
            .update({
              plan:                   'trial',
              stripe_subscription_id: null,
              subscription_status:    'canceled',
              subscription_period_end: null,
            })
            .eq('id', org.id)

          console.log(`[Stripe Webhook] Org ${org.id} subscription deleted — reverted to trial`)
        }
        break
      }

      default:
        // Unhandled event types — acknowledge receipt
        break
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
