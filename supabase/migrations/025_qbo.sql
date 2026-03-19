-- 025_qbo.sql — QuickBooks Online integration

-- QBO OAuth connection per org (one per org)
CREATE TABLE IF NOT EXISTS qbo_connections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  realm_id          text        NOT NULL,    -- QBO company ID
  access_token      text        NOT NULL,
  refresh_token     text        NOT NULL,
  token_expires_at  timestamptz NOT NULL,
  scope             text,
  company_name      text,                    -- fetched from QBO CompanyInfo
  connected_at      timestamptz NOT NULL DEFAULT now(),
  last_synced_at    timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

-- Track QBO IDs on existing records for sync deduplication
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS qbo_customer_id text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_invoice_id   text;

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;

-- Only org owners and dispatchers can see the QBO connection
CREATE POLICY "owner dispatcher view qbo connection" ON qbo_connections
  FOR SELECT
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

CREATE POLICY "owner dispatcher insert qbo connection" ON qbo_connections
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

CREATE POLICY "owner dispatcher update qbo connection" ON qbo_connections
  FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

CREATE POLICY "owner dispatcher delete qbo connection" ON qbo_connections
  FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );
