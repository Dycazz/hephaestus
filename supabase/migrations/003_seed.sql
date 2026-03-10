-- ============================================================
-- 003_seed.sql — Demo seed data for development/testing
-- Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING.
-- ============================================================

-- Demo org
insert into organizations (id, name, slug, business_name, review_url, plan)
values (
  '00000000-0000-0000-0000-000000000001',
  'Mikes Plumbing HVAC',
  'mikes-plumbing',
  'Mike''s Plumbing & HVAC',
  'https://g.page/r/mikes-plumbing-review',
  'trial'
)
on conflict (id) do nothing;

-- Services catalog
insert into services (org_id, name, icon, color, prep_templates) values
  ('00000000-0000-0000-0000-000000000001', 'Plumbing', '🔧', 'blue',
   '["Clear all items from under the sink", "Turn off water supply valve under sink", "Have towels nearby — minor water spillage may occur"]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'HVAC', '❄️', 'cyan',
   '["Clear 3-ft clearance around your outdoor AC unit", "Locate your air filter — we will inspect and replace if needed", "Clear access to attic if applicable"]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'Electrical', '⚡', 'yellow',
   '["Ensure breaker panel is fully accessible", "Have a list of outlets or switches needing work"]'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'Heating', '🔥', 'orange',
   '["Locate your furnace or boiler", "Clear 2-ft access around the heating unit", "Note any error codes on your thermostat"]'::jsonb)
on conflict do nothing;

-- Technicians
insert into technicians (id, org_id, name, initials, color, is_active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Dave Kowalski', 'DK', 'blue',   true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Maria Santos',  'MS', 'purple', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'James Lee',     'JL', 'green',  true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Tony Reeves',   'TR', 'orange', true)
on conflict (id) do nothing;

-- Clients
insert into clients (id, org_id, name, phone, address) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Jennifer Adams',  '(555) 214-8833', '142 Maple Ave'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Carlos Rivera',   '(555) 387-0021', '88 Birchwood Dr'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Susan Taylor',    '(555) 540-1199', '310 Oak Street'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'David Kim',       '(555) 721-4456', '57 Elm Court, Unit 4B'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Patricia Nelson', '(555) 893-6672', '29 Pinecrest Blvd')
on conflict (id) do nothing;

-- Appointments (scheduled_at uses today's date at various hours)
insert into appointments (id, org_id, client_id, technician_id, service, service_icon, service_color, scheduled_at, status, address, prep_checklist, notes) values
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Plumbing', '🔧', 'blue',
    (current_date + interval '9 hours')::timestamptz,
    'confirmed',
    '142 Maple Ave',
    '["Clear all items from under the kitchen sink", "Turn off water supply valve under sink"]'::jsonb,
    null
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'HVAC', '❄️', 'cyan',
    (current_date + interval '11 hours')::timestamptz,
    'confirmed',
    '88 Birchwood Dr',
    '["Locate your air filter — we will inspect and replace if needed", "Clear 3-ft clearance around your outdoor AC unit"]'::jsonb,
    null
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'Electrical', '⚡', 'yellow',
    (current_date + interval '13 hours')::timestamptz,
    'reminder_sent',
    '310 Oak Street',
    '["Ensure your breaker panel is fully accessible", "Have a list of outlets or switches needing work"]'::jsonb,
    null
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Plumbing', '🔧', 'blue',
    (current_date + interval '15 hours')::timestamptz,
    'reminder_sent',
    '57 Elm Court, Unit 4B',
    '["Clear out the bathroom vanity cabinet completely", "Have towels nearby — minor water spillage may occur"]'::jsonb,
    null
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'HVAC', '❄️', 'cyan',
    (current_date + interval '17 hours')::timestamptz,
    'at_risk',
    '29 Pinecrest Blvd',
    '["Locate your thermostat and note any error codes", "Clear access to attic entry if applicable"]'::jsonb,
    '⚠ No response to 2 reminders. 12 hrs out.'
  )
on conflict (id) do nothing;

-- Waitlist
insert into waitlist (org_id, name, phone, service_pref) values
  ('00000000-0000-0000-0000-000000000001', 'Mark Thompson', '(555) 304-7781', 'Plumbing'),
  ('00000000-0000-0000-0000-000000000001', 'Angela Foster',  '(555) 219-0034', 'HVAC')
on conflict do nothing;
