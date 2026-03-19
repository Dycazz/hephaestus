-- Add onboarding tracking to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Mark all existing orgs as onboarding-complete so they aren't forced through the wizard
UPDATE organizations SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL;
