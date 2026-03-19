/**
 * Plan access helpers for hephaestus.work.
 *
 * Determines what an org can do based on their current plan,
 * subscription status, trial state, and suspension status.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { PAID_PLANS, type PaidPlanKey } from './stripe'

// ── Types ──────────────────────────────────────────────────────────────────

export type AllPlanKey = 'trial' | 'gifted' | PaidPlanKey

export type PlanAccessResult =
  | { suspended: true;  plan: AllPlanKey; active: false }
  | { suspended: false; plan: AllPlanKey; active: boolean }

export type LimitResource = 'jobs' | 'techs' | 'sms'

export interface LimitCheck {
  allowed: boolean
  current: number
  limit: number      // Infinity = unlimited
}

// ── Plan limits ────────────────────────────────────────────────────────────

/** Limits for each plan. Infinity = no limit. */
export const PLAN_LIMITS: Record<AllPlanKey, { jobs: number; techs: number; sms: number }> = {
  trial:      { jobs: 25,       techs: 2,        sms: 50       },
  starter:    { jobs: 200,      techs: 3,        sms: 500      },
  pro:        { jobs: Infinity, techs: 5,        sms: Infinity },
  enterprise: { jobs: Infinity, techs: Infinity,  sms: Infinity },
  gifted:     { jobs: Infinity, techs: Infinity,  sms: Infinity },
}

// ── Feature flags ─────────────────────────────────────────────────────────────

/**
 * Returns true if the org's plan includes the invoicing feature.
 * Invoicing requires a paid plan (starter, pro, enterprise, or gifted).
 */
export function planIncludesInvoicing(plan: AllPlanKey): boolean {
  return plan !== 'trial'
}

/**
 * Returns true if the org's plan includes the estimates feature.
 * Estimates require a paid plan (starter, pro, enterprise, or gifted).
 */
export function planIncludesEstimates(plan: AllPlanKey): boolean {
  return plan !== 'trial'
}

/**
 * Returns true if the org's plan includes the job costing feature.
 * Job costing requires starter or above.
 */
export function planIncludesJobCosting(plan: AllPlanKey): boolean {
  return plan !== 'trial'
}

/**
 * Returns true if the org's plan includes QuickBooks Online sync.
 * QBO sync requires pro or enterprise (or gifted).
 */
export function planIncludesQBO(plan: AllPlanKey): boolean {
  return plan === 'pro' || plan === 'enterprise' || plan === 'gifted'
}

// ── Core access check ──────────────────────────────────────────────────────

/**
 * Returns the effective plan access for an org.
 * Does NOT throw — returns suspended/expired state instead.
 */
export async function getOrgPlanAccess(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PlanAccessResult> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('plan, trial_ends_at, suspended_at, subscription_status, subscription_period_end')
    .eq('id', orgId)
    .single()

  if (error || !org) {
    console.error('[getOrgPlanAccess] Failed to fetch org status:', orgId, error?.message)
    throw new Error(`Could not load organization plan: ${error?.message ?? 'org not found'}`)
  }

  const plan = (org.plan ?? 'trial') as AllPlanKey

  // 1. Suspended orgs — no access at all
  if (org.suspended_at) {
    return { suspended: true, plan, active: false }
  }

  // 2. Admin-gifted free plan — always active
  if (plan === 'gifted') {
    return { suspended: false, plan: 'gifted', active: true }
  }

  // 3. Paid subscription plans
  if (plan === 'starter' || plan === 'pro' || plan === 'enterprise') {
    const status = org.subscription_status as string | null
    const periodEnd = org.subscription_period_end ? new Date(org.subscription_period_end) : null
    const isStatusActive = status === 'active' || status === 'trialing'
    const isPeriodValid = !periodEnd || periodEnd > new Date()
    const isActive = (status ? isStatusActive : true) && isPeriodValid

    return { suspended: false, plan, active: isActive }
  }

  // 4. Trial plan
  const trialActive =
    !!org.trial_ends_at && new Date(org.trial_ends_at) > new Date()

  return { suspended: false, plan: 'trial', active: trialActive }
}

// ── Resource limit checks ──────────────────────────────────────────────────

/**
 * Check whether an org is under their limit for a given resource.
 * Returns { allowed, current, limit }.
 */
export async function checkLimit(
  orgId: string,
  resource: LimitResource,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<LimitCheck> {
  const access = await getOrgPlanAccess(orgId, supabase)

  // Suspended orgs can't create anything
  if (access.suspended) {
    return { allowed: false, current: 0, limit: 0 }
  }

  // Expired paid plan — fall back to trial limits
  const effectivePlan: AllPlanKey = access.active ? access.plan : 'trial'

  // Expired trial — block all creation
  if (!access.active && effectivePlan === 'trial') {
    return { allowed: false, current: 0, limit: 0 }
  }

  const limit = PLAN_LIMITS[effectivePlan][resource]

  // Unlimited plans — always allowed
  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  // Count current usage
  const current = await countUsage(orgId, resource, supabase)
  return { allowed: current < limit, current, limit }
}

// ── Usage counters ─────────────────────────────────────────────────────────

async function countUsage(
  orgId: string,
  resource: LimitResource,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<number> {
  if (resource === 'jobs') {
    // Count non-cancelled appointments created this calendar month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'cancelled')
      .gte('created_at', startOfMonth.toISOString())

    return count ?? 0
  }

  if (resource === 'techs') {
    // Count active technicians
    const { count } = await supabase
      .from('technicians')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('is_active', true)

    return count ?? 0
  }

  if (resource === 'sms') {
    // Count outbound SMS sent this calendar month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('direction', 'outbound')
      .gte('created_at', startOfMonth.toISOString())

    return count ?? 0
  }

  return 0
}
