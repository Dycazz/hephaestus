-- ============================================================
-- 001_schema.sql — hephaestus.work core tables
-- Runs on Supabase (PostgreSQL 15+).
-- Uses gen_random_uuid() — built-in, no extension needed.
-- ============================================================

-- ============================================================
-- organizations — one row per field-service business
-- ============================================================
create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                        -- "Mike's Plumbing & HVAC"
  slug              text not null unique,                 -- "mikes-plumbing" (used in public URLs)
  business_name     text not null,                        -- display name on dashboard
  twilio_phone_number text,                               -- "+15551234567"
  review_url        text,                                 -- "https://g.page/r/..."
  plan              text not null default 'trial',        -- trial | starter | pro
  created_at        timestamptz not null default now()
);

-- ============================================================
-- profiles — one per user, extends auth.users
-- ============================================================
create table profiles (
  id       uuid primary key references auth.users on delete cascade,
  org_id   uuid not null references organizations on delete cascade,
  full_name text,
  role     text not null default 'dispatcher',  -- owner | dispatcher | viewer
  created_at timestamptz not null default now()
);

-- ============================================================
-- technicians — field staff belonging to an org
-- ============================================================
create table technicians (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations on delete cascade,
  name       text not null,
  initials   text,
  color      text,           -- tailwind color name, e.g. "blue"
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- clients — normalized customer records
-- ============================================================
create table clients (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations on delete cascade,
  name       text not null,
  phone      text not null,
  email      text,
  address    text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- appointments — core scheduling record
-- ============================================================
create type appointment_status as enum (
  'scheduled',
  'reminder_sent',
  'confirmed',
  'rescheduling',
  'at_risk',
  'completed',
  'cancelled'
);

create table appointments (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations on delete cascade,
  client_id        uuid references clients on delete set null,
  technician_id    uuid references technicians on delete set null,
  service          text not null,
  service_icon     text,
  service_color    text,
  scheduled_at     timestamptz not null,
  status           appointment_status not null default 'scheduled',
  address          text,
  prep_checklist   jsonb not null default '[]',
  review_request_sent boolean not null default false,
  completed_at     timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointments_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- ============================================================
-- sms_messages — one row per message in a thread
-- ============================================================
create type sms_direction as enum ('outbound', 'inbound');
create type sms_message_type as enum (
  'reminder', 'confirmation', 'customer_reply',
  'reschedule_link', 'review_request', 'general'
);

create table sms_messages (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments on delete cascade,
  org_id          uuid not null references organizations on delete cascade,
  direction       sms_direction not null,
  body            text not null,
  message_type    sms_message_type not null default 'general',
  twilio_sid      text,
  delivery_status text,                     -- queued | sent | delivered | failed
  from_number     text,
  to_number       text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- waitlist — customers waiting for an open slot
-- ============================================================
create table waitlist (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations on delete cascade,
  name             text not null,
  phone            text not null,
  service_pref     text,
  is_active        boolean not null default true,
  notified_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- services — org-specific service catalog
-- ============================================================
create table services (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations on delete cascade,
  name           text not null,
  icon           text,
  color          text,
  prep_templates jsonb not null default '[]',   -- array of default checklist strings
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index on appointments (org_id, scheduled_at);
create index on appointments (org_id, status);
create index on sms_messages (appointment_id);
create index on clients (org_id, phone);
create index on technicians (org_id);
