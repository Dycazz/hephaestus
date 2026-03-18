-- Technician commission tracking (percentage of job revenue)
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 0;

-- Business expenses log
CREATE TABLE IF NOT EXISTS expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  amount_cents  integer NOT NULL DEFAULT 0,
  category      text NOT NULL DEFAULT 'other',
  expense_date  date NOT NULL DEFAULT CURRENT_DATE,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members access expenses" ON expenses
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Tax rate stored on the organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0;
