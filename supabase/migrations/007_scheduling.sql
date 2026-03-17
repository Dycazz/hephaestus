-- ─────────────────────────────────────────────────────────────────────────────
-- 007_scheduling.sql
-- Full-suite scheduling: appointment duration, recurring jobs,
-- and per-technician working-hour availability.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Appointment enhancements ─────────────────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes       integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS recurrence_rule        text    NOT NULL DEFAULT 'none'
    CHECK (recurrence_rule IN ('none','daily','weekly','biweekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_end_date    date,
  ADD COLUMN IF NOT EXISTS parent_appointment_id  uuid
    REFERENCES appointments(id) ON DELETE SET NULL;

-- Index for fetching all occurrences of a recurring series
CREATE INDEX IF NOT EXISTS idx_appointments_parent
  ON appointments(parent_appointment_id)
  WHERE parent_appointment_id IS NOT NULL;

-- ── Technician working-hours table ───────────────────────────────────────────

-- One row per technician per day-of-week (0=Sun … 6=Sat).
-- Missing rows → default (Mon–Fri 08:00–17:00, Sat/Sun off) applied in the API.
CREATE TABLE IF NOT EXISTS technician_availability (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES technicians(id)  ON DELETE CASCADE,
  day_of_week   integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    time    NOT NULL DEFAULT '08:00',
  end_time      time    NOT NULL DEFAULT '17:00',
  is_working    boolean NOT NULL DEFAULT true,
  UNIQUE (technician_id, day_of_week)
);

ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage availability"
  ON technician_availability
  FOR ALL
  USING  (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());
