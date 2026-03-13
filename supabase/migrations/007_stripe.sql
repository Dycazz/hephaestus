-- Migration 007: Add Stripe subscription fields to organizations
-- Run this in the Supabase SQL editor or via Supabase CLI

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id      text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  text,
  ADD COLUMN IF NOT EXISTS subscription_status     text,      -- 'active' | 'past_due' | 'canceled' | null
  ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz;

-- Index for webhook lookups by Stripe IDs
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer    ON organizations (stripe_customer_id)   WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_subscription ON organizations (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
