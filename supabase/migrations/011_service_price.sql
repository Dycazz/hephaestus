-- Add price_cents to services table
alter table services add column if not exists price_cents integer not null default 0;
