-- ============================================================
-- Migration 008: Booking Portal
-- Safe to re-run (all statements are idempotent)
-- ============================================================

-- 1. Ensure booking_links has all required columns
alter table booking_links
  add column if not exists business_logo_url text,
  add column if not exists business_phone text,
  add column if not exists accent_color text default '#f97316',
  add column if not exists background_color text default '#090909',
  add column if not exists text_color text default '#f0ece3',
  add column if not exists show_pricing boolean default true,
  add column if not exists require_customer_email boolean default true,
  add column if not exists require_customer_phone boolean default true,
  add column if not exists booking_window_days int default 30,
  add column if not exists slot_duration_minutes int default 60,
  add column if not exists is_active boolean default true,
  add column if not exists total_views int default 0,
  add column if not exists total_bookings int default 0;

-- 2. Create remaining tables
create table if not exists booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_link_id uuid references booking_links(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 60,
  price_cents int default 0,
  display_order int default 0,
  is_active boolean default true
);

create table if not exists booking_availability (
  id uuid primary key default gen_random_uuid(),
  booking_link_id uuid references booking_links(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null,
  is_active boolean default true
);

create table if not exists booking_overrides (
  id uuid primary key default gen_random_uuid(),
  booking_link_id uuid references booking_links(id) on delete cascade,
  date date not null,
  is_available boolean not null,
  start_time time,
  end_time time
);

create table if not exists portal_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_link_id uuid references booking_links(id) on delete cascade,
  service_id uuid references booking_services(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_notes text,
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes int,
  status text default 'pending',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

-- 3. RPC functions
create or replace function increment_booking_link_views(link_id uuid)
returns void language sql as $$
  update booking_links set total_views = total_views + 1 where id = link_id;
$$;

create or replace function increment_booking_link_bookings(link_id uuid)
returns void language sql as $$
  update booking_links set total_bookings = total_bookings + 1 where id = link_id;
$$;

-- 4. Enable RLS on all new tables
alter table booking_links enable row level security;
alter table booking_services enable row level security;
alter table booking_availability enable row level security;
alter table booking_overrides enable row level security;
alter table portal_bookings enable row level security;

-- 5. RLS Policies (skip if already exist)
do $blk$ begin
  -- booking_links
  if not exists (select 1 from pg_policies where tablename='booking_links' and policyname='Public can view active booking links') then
    create policy "Public can view active booking links"
      on booking_links for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename='booking_links' and policyname='Org owners manage their booking link') then
    create policy "Org owners manage their booking link"
      on booking_links for all
      using (org_id in (select org_id from profiles where id = auth.uid()));
  end if;

  -- booking_services
  if not exists (select 1 from pg_policies where tablename='booking_services' and policyname='Public can view active services') then
    create policy "Public can view active services"
      on booking_services for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename='booking_services' and policyname='Org owners manage services') then
    create policy "Org owners manage services"
      on booking_services for all
      using (booking_link_id in (
        select id from booking_links where org_id in (
          select org_id from profiles where id = auth.uid()
        )
      ));
  end if;

  -- booking_availability
  if not exists (select 1 from pg_policies where tablename='booking_availability' and policyname='Public can view availability') then
    create policy "Public can view availability"
      on booking_availability for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='booking_availability' and policyname='Org owners manage availability') then
    create policy "Org owners manage availability"
      on booking_availability for all
      using (booking_link_id in (
        select id from booking_links where org_id in (
          select org_id from profiles where id = auth.uid()
        )
      ));
  end if;

  -- booking_overrides
  if not exists (select 1 from pg_policies where tablename='booking_overrides' and policyname='Public can view overrides') then
    create policy "Public can view overrides"
      on booking_overrides for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='booking_overrides' and policyname='Org owners manage overrides') then
    create policy "Org owners manage overrides"
      on booking_overrides for all
      using (booking_link_id in (
        select id from booking_links where org_id in (
          select org_id from profiles where id = auth.uid()
        )
      ));
  end if;

  -- portal_bookings
  if not exists (select 1 from pg_policies where tablename='portal_bookings' and policyname='Anyone can create a booking') then
    create policy "Anyone can create a booking"
      on portal_bookings for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='portal_bookings' and policyname='Org owners can view bookings') then
    create policy "Org owners can view bookings"
      on portal_bookings for select
      using (booking_link_id in (
        select id from booking_links where org_id in (
          select org_id from profiles where id = auth.uid()
        )
      ));
  end if;
end $blk$;
