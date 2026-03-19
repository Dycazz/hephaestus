-- 021_invoices.sql — Invoice tracking

-- Sequential invoice counter per org
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS next_invoice_number integer NOT NULL DEFAULT 1;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id               uuid        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status                  text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  invoice_number          text        NOT NULL,
  issued_date             date        NOT NULL DEFAULT CURRENT_DATE,
  due_date                date        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  notes                   text,
  subtotal_cents          integer     NOT NULL DEFAULT 0,
  tax_cents               integer     NOT NULL DEFAULT 0,
  total_cents             integer     NOT NULL DEFAULT 0,
  paid_at                 timestamptz,
  payment_method          text        CHECK (payment_method IN ('stripe','cash','check','other')),
  stripe_payment_link_url text,
  pdf_storage_path        text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, invoice_number)
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  appointment_id    uuid        REFERENCES appointments(id) ON DELETE SET NULL,
  description       text        NOT NULL,
  quantity          integer     NOT NULL DEFAULT 1,
  unit_price_cents  integer     NOT NULL DEFAULT 0,
  total_cents       integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Invoices: all org members (owner, dispatcher, viewer) can read
CREATE POLICY "org members view invoices" ON invoices
  FOR SELECT
  USING (org_id = auth_org_id());

-- Invoices: only owners and dispatchers can insert
CREATE POLICY "owner dispatcher insert invoices" ON invoices
  FOR INSERT
  WITH CHECK (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Invoices: only owners and dispatchers can update
CREATE POLICY "owner dispatcher update invoices" ON invoices
  FOR UPDATE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Invoices: only owners and dispatchers can delete
CREATE POLICY "owner dispatcher delete invoices" ON invoices
  FOR DELETE
  USING (
    org_id = auth_org_id() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Line items: follow invoice access
CREATE POLICY "org members view line items" ON invoice_line_items
  FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE org_id = auth_org_id())
  );

CREATE POLICY "owner dispatcher insert line items" ON invoice_line_items
  FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher update line items" ON invoice_line_items
  FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

CREATE POLICY "owner dispatcher delete line items" ON invoice_line_items
  FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE org_id = auth_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'dispatcher'))
    )
  );

-- ── Supabase Storage bucket for PDFs ──────────────────────────────────────────
-- PDFs are accessed via signed URLs (generated server-side), so no public policy needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;
