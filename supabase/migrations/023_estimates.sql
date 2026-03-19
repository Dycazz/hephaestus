-- 023_estimates.sql — Estimates / Quotes workflow

-- Sequential estimate counter per org
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS next_estimate_number integer NOT NULL DEFAULT 1;

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status           text        NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','invoiced')),
  estimate_number  text        NOT NULL,
  title            text,
  issued_date      date        NOT NULL DEFAULT CURRENT_DATE,
  expiry_date      date,
  notes            text,
  subtotal_cents   integer     NOT NULL DEFAULT 0,
  tax_cents        integer     NOT NULL DEFAULT 0,
  total_cents      integer     NOT NULL DEFAULT 0,
  viewed_at        timestamptz,    -- set when client opens public link
  accepted_at      timestamptz,
  declined_at      timestamptz,
  invoice_id       uuid        REFERENCES invoices(id) ON DELETE SET NULL,
  public_token     text        UNIQUE,   -- HMAC token for public view URL
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, estimate_number)
);

-- Estimate line items
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id       uuid        NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  appointment_id    uuid        REFERENCES appointments(id) ON DELETE SET NULL,
  description       text        NOT NULL,
  quantity          integer     NOT NULL DEFAULT 1,
  unit_price_cents  integer     NOT NULL DEFAULT 0,
  total_cents       integer     NOT NULL DEFAULT 0,
  tax_exempt        boolean     NOT NULL DEFAULT false,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Snapshot taxes applied to an estimate
CREATE TABLE IF NOT EXISTS estimate_taxes (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id  uuid          NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  tax_rate_id  uuid          REFERENCES tax_rates(id) ON DELETE SET NULL,
  name         text          NOT NULL,
  rate_percent numeric(5,3)  NOT NULL,
  tax_cents    integer       NOT NULL
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_taxes ENABLE ROW LEVEL SECURITY;

-- Estimates: all org members can read
CREATE POLICY "org members view estimates" ON estimates
  FOR SELECT
  USING (org_id = auth_org_id());

CREATE POLICY "owner dispatcher insert estimates" ON estimates
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

CREATE POLICY "owner dispatcher update estimates" ON estimates
  FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

CREATE POLICY "owner dispatcher delete estimates" ON estimates
  FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Estimate line items: follow estimate access
CREATE POLICY "org members view estimate line items" ON estimate_line_items
  FOR SELECT
  USING (
    estimate_id IN (SELECT id FROM estimates WHERE org_id = auth_org_id())
  );

CREATE POLICY "owner dispatcher insert estimate line items" ON estimate_line_items
  FOR INSERT
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher update estimate line items" ON estimate_line_items
  FOR UPDATE
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher delete estimate line items" ON estimate_line_items
  FOR DELETE
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

-- Estimate taxes: follow estimate access
CREATE POLICY "org members view estimate taxes" ON estimate_taxes
  FOR SELECT
  USING (
    estimate_id IN (SELECT id FROM estimates WHERE org_id = auth_org_id())
  );

CREATE POLICY "owner dispatcher insert estimate taxes" ON estimate_taxes
  FOR INSERT
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher update estimate taxes" ON estimate_taxes
  FOR UPDATE
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher delete estimate taxes" ON estimate_taxes
  FOR DELETE
  USING (
    estimate_id IN (
      SELECT id FROM estimates
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );
