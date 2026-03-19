/**
 * Stripe client and plan configuration for hephaestus.work.
 *
 * Secrets are read from the Cloudflare Workers request context
 * (via globalThis[Symbol.for('__cloudflare-context__')]) so they are
 * always current, with process.env as fallback for local dev.
 */

import Stripe from 'stripe'

// ── CF context helper ──────────────────────────────────────────────────────

function getCfEnv(): Record<string, string | undefined> {
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    return cfCtx?.env ?? {}
  } catch {
    return {}
  }
}

function getEnvVar(name: string): string {
  const cfVal = getCfEnv()[name]
  if (cfVal) return cfVal
  const nodeVal = process.env[name]
  if (nodeVal) return nodeVal
  throw new Error(`Missing required environment variable: ${name}`)
}

// ── Stripe client ──────────────────────────────────────────────────────────

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  // Re-instantiate on each call so we always pick up the current CF env binding
  const key = getEnvVar('STRIPE_SECRET_KEY')
  return new Stripe(key, {
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    // Required for Cloudflare Workers — no Node.js http module available
    httpClient: Stripe.createFetchHttpClient(),
  })
}

export function getStripeWebhookSecret(): string {
  return getEnvVar('STRIPE_WEBHOOK_SECRET')
}

// ── Plan configuration ─────────────────────────────────────────────────────

export type PaidPlanKey = 'starter' | 'pro' | 'enterprise'

export interface PlanConfig {
  name: string
  price: number          // USD / month
  color: string
  jobs: number           // per month; Infinity = unlimited
  techs: number          // active technicians; Infinity = unlimited
  sms: number            // per month; Infinity = unlimited
  getPriceId: () => string
}

export const PAID_PLANS: Record<PaidPlanKey, PlanConfig> = {
  starter: {
    name: 'Starter',
    price: 24.99,
    color: '#3b82f6',
    jobs: 200,
    techs: 3,
    sms: 500,
    getPriceId: () => getEnvVar('STRIPE_PRICE_STARTER_ID'),
  },
  pro: {
    name: 'Pro',
    price: 49.99,
    color: '#a855f7',
    jobs: Infinity,
    techs: 5,
    sms: Infinity,
    getPriceId: () => getEnvVar('STRIPE_PRICE_PRO_ID'),
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    color: '#f59e0b',
    jobs: Infinity,
    techs: Infinity,
    sms: Infinity,
    getPriceId: () => getEnvVar('STRIPE_PRICE_ENTERPRISE_ID'),
  },
}

export const PLAN_ORDER: PaidPlanKey[] = ['starter', 'pro', 'enterprise']

// ── Invoice payment links ───────────────────────────────────────────────────

/**
 * Create a one-time Stripe Payment Link for an invoice.
 * Returns the payment link URL to share with the client.
 */
export async function createInvoicePaymentLink(params: {
  invoiceId: string
  invoiceNumber: string
  totalCents: number
  orgId: string
}): Promise<string> {
  const stripe = getStripe()

  // Create a one-time price for this invoice amount
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: params.totalCents,
    product_data: {
      name: `Invoice ${params.invoiceNumber}`,
    },
  })

  // Create a reusable payment link for this price
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      invoice_id: params.invoiceId,
      org_id: params.orgId,
    },
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: {
        custom_message: 'Thank you for your payment! Your invoice has been paid.',
      },
    },
  })

  return link.url
}

/** Map from Stripe Price ID → plan key (resolved at call-time) */
export function priceIdToPlanKey(priceId: string): PaidPlanKey | null {
  for (const [key, cfg] of Object.entries(PAID_PLANS) as [PaidPlanKey, PlanConfig][]) {
    try {
      if (cfg.getPriceId() === priceId) return key
    } catch {
      // env var not set — skip
    }
  }
  return null
}
