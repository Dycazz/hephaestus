-- Create waitlist table
drop table if exists public.waitlist cascade;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  customer_address text,
  service_id uuid references public.services(id) on delete set null,
  notes text,
  status text not null default 'pending', -- 'pending', 'contacted', 'booked', 'expired'
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Policies
create policy "Orgs can see their own waitlist"
  on public.waitlist for select
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Orgs can update their own waitlist"
  on public.waitlist for update
  using (org_id in (select org_id from public.profiles where id = auth.uid()));

create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);
