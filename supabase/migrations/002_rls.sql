-- ============================================================
-- 002_rls.sql — Row Level Security policies
-- Every table is scoped to the user's organization.
-- ============================================================

-- Helper function: get the org_id for the currently authenticated user.
-- IMPORTANT: security definer + set search_path prevents two problems:
--   1. Infinite recursion — without security definer, calling this from a
--      profiles RLS policy would recursively trigger that same policy.
--   2. Search path injection — pinning search_path = public is a security best practice.
create or replace function auth_org_id()
returns uuid language sql stable
security definer set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- ============================================================
-- organizations
-- ============================================================
alter table organizations enable row level security;

create policy "org members can read their org"
  on organizations for select
  using (id = auth_org_id());

create policy "org owners can update their org"
  on organizations for update
  using (id = auth_org_id());

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

create policy "users can read profiles in their org"
  on profiles for select
  using (org_id = auth_org_id());

create policy "users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Allow insert during signup (profile row doesn't exist yet — auth_org_id() would return NULL)
create policy "allow profile creation on signup"
  on profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- technicians
-- ============================================================
alter table technicians enable row level security;

create policy "org members can read technicians"
  on technicians for select
  using (org_id = auth_org_id());

create policy "org members can insert technicians"
  on technicians for insert
  with check (org_id = auth_org_id());

create policy "org members can update technicians"
  on technicians for update
  using (org_id = auth_org_id());

create policy "org members can delete technicians"
  on technicians for delete
  using (org_id = auth_org_id());

-- ============================================================
-- clients
-- ============================================================
alter table clients enable row level security;

create policy "org members can read clients"
  on clients for select
  using (org_id = auth_org_id());

create policy "org members can insert clients"
  on clients for insert
  with check (org_id = auth_org_id());

create policy "org members can update clients"
  on clients for update
  using (org_id = auth_org_id());

-- ============================================================
-- appointments
-- ============================================================
alter table appointments enable row level security;

create policy "org members can read appointments"
  on appointments for select
  using (org_id = auth_org_id());

create policy "org members can insert appointments"
  on appointments for insert
  with check (org_id = auth_org_id());

create policy "org members can update appointments"
  on appointments for update
  using (org_id = auth_org_id());

create policy "org members can delete appointments"
  on appointments for delete
  using (org_id = auth_org_id());

-- ============================================================
-- sms_messages
-- ============================================================
alter table sms_messages enable row level security;

create policy "org members can read sms_messages"
  on sms_messages for select
  using (org_id = auth_org_id());

create policy "org members can insert sms_messages"
  on sms_messages for insert
  with check (org_id = auth_org_id());

-- Twilio webhook inserts use the service_role key, which bypasses RLS entirely.

-- ============================================================
-- waitlist
-- ============================================================
alter table waitlist enable row level security;

create policy "org members can read waitlist"
  on waitlist for select
  using (org_id = auth_org_id());

create policy "org members can insert waitlist"
  on waitlist for insert
  with check (org_id = auth_org_id());

create policy "org members can update waitlist"
  on waitlist for update
  using (org_id = auth_org_id());

create policy "org members can delete waitlist"
  on waitlist for delete
  using (org_id = auth_org_id());

-- ============================================================
-- services
-- ============================================================
alter table services enable row level security;

create policy "org members can read services"
  on services for select
  using (org_id = auth_org_id());

create policy "org members can insert services"
  on services for insert
  with check (org_id = auth_org_id());

create policy "org members can update services"
  on services for update
  using (org_id = auth_org_id());

create policy "org members can delete services"
  on services for delete
  using (org_id = auth_org_id());
