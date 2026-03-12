-- Team invitations
-- Allows org owners/dispatchers to invite new members by email.
-- The invitation token is included in a signup link; on signup the invitee
-- is automatically linked to the org with the specified role.

create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('dispatcher', 'viewer')),
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

-- Only members of the same org can read invitations
alter table invitations enable row level security;

create policy "org members can read invitations"
  on invitations for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.org_id = invitations.org_id
    )
  );

create policy "org members can create invitations"
  on invitations for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.org_id = invitations.org_id
        and profiles.role in ('owner', 'dispatcher')
    )
  );

create policy "org members can delete invitations"
  on invitations for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.org_id = invitations.org_id
        and profiles.role in ('owner', 'dispatcher')
    )
  );

-- Allow public read of a single invitation by token (for the accept flow)
-- Uses service role in the API so no additional RLS needed here.
