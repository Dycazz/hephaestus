-- 022_tax_rates.sql — Multi-jurisdiction tax handling

-- Per-org reusable tax rates
CREATE TABLE IF NOT EXISTS tax_rates (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         text          NOT NULL,       -- e.g. "CA State Tax", "LA County"
  rate_percent numeric(5,3)  NOT NULL,       -- e.g. 8.250
  is_default   boolean       NOT NULL DEFAULT false,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

-- Snapshot of taxes applied to a specific invoice (preserves rates at time of invoicing)
CREATE TABLE IF NOT EXISTS invoice_taxes (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tax_rate_id  uuid          REFERENCES tax_rates(id) ON DELETE SET NULL,
  name         text          NOT NULL,       -- snapshot
  rate_percent numeric(5,3)  NOT NULL,       -- snapshot
  tax_cents    integer       NOT NULL
);

-- Allow per-line-item tax exemption
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS tax_exempt boolean NOT NULL DEFAULT false;

-- Link org to its default tax rate (optional convenience)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_tax_rate_id uuid REFERENCES tax_rates(id) ON DELETE SET NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_taxes ENABLE ROW LEVEL SECURITY;

-- tax_rates: all org members can read
CREATE POLICY "org members view tax rates" ON tax_rates
  FOR SELECT
  USING (org_id = auth_org_id());

-- tax_rates: owner/dispatcher can insert
CREATE POLICY "owner dispatcher insert tax rates" ON tax_rates
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- tax_rates: owner/dispatcher can update
CREATE POLICY "owner dispatcher update tax rates" ON tax_rates
  FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- tax_rates: owner/dispatcher can delete
CREATE POLICY "owner dispatcher delete tax rates" ON tax_rates
  FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- invoice_taxes: readable by all org members (via invoice ownership)
CREATE POLICY "org members view invoice taxes" ON invoice_taxes
  FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE org_id = auth_org_id())
  );

-- invoice_taxes: owner/dispatcher can insert
CREATE POLICY "owner dispatcher insert invoice taxes" ON invoice_taxes
  FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

-- invoice_taxes: owner/dispatcher can update
CREATE POLICY "owner dispatcher update invoice taxes" ON invoice_taxes
  FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

-- invoice_taxes: owner/dispatcher can delete
CREATE POLICY "owner dispatcher delete invoice taxes" ON invoice_taxes
  FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );
