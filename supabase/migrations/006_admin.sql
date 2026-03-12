-- Internal admin support
-- is_admin: set manually in Supabase for Hephaestus team members
-- trial_ends_at: allows per-org trial extension
-- suspended_at: soft-suspend an org (set to non-null = suspended)

alter table profiles
  add column if not exists is_admin boolean not null default false;

alter table organizations
  add column if not exists trial_ends_at timestamptz,
  add column if not exists suspended_at  timestamptz;

-- Admin users can read all profiles (needed for the admin panel member lists).
-- This policy uses service_role in the API, so no additional RLS is needed.
-- The is_admin flag itself is protected: only service_role can write it.
