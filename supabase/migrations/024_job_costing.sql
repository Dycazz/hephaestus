-- 024_job_costing.sql — Granular job costing per appointment

-- Per-technician hourly rate
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hourly_rate_cents integer;

-- Job cost items — track labor, materials, equipment, etc. per appointment
CREATE TABLE IF NOT EXISTS job_cost_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id   uuid          NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  category         text          NOT NULL DEFAULT 'material'
                     CHECK (category IN ('labor','material','equipment','subcontractor','overhead')),
  description      text          NOT NULL,
  quantity         numeric(10,2) NOT NULL DEFAULT 1,
  unit_cost_cents  integer       NOT NULL DEFAULT 0,
  total_cost_cents integer       NOT NULL DEFAULT 0,   -- quantity * unit_cost_cents
  technician_id    uuid          REFERENCES profiles(id) ON DELETE SET NULL,  -- for labor items
  hours            numeric(8,2),                                               -- for labor items
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE job_cost_items ENABLE ROW LEVEL SECURITY;

-- All org members can view job cost items
CREATE POLICY "org members view job cost items" ON job_cost_items
  FOR SELECT
  USING (org_id = auth_org_id());

-- Owners and dispatchers can insert
CREATE POLICY "owner dispatcher insert job cost items" ON job_cost_items
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Technicians can insert their own labor items
CREATE POLICY "technician insert own labor cost" ON job_cost_items
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id()
    AND category = 'labor'
    AND technician_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'technician'
    )
  );

-- Owners and dispatchers can update
CREATE POLICY "owner dispatcher update job cost items" ON job_cost_items
  FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Owners and dispatchers can delete
CREATE POLICY "owner dispatcher delete job cost items" ON job_cost_items
  FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );
