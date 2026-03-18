-- Link booking_services back to the internal services table so changes sync automatically
alter table booking_services
  add column if not exists service_id uuid references services(id) on delete set null;
