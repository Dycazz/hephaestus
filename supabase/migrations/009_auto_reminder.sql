-- Add auto_reminder flag to appointments.
-- When false, this appointment is excluded from automated reminder workflows.
-- Defaults to true so all existing appointments continue to receive reminders.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS auto_reminder BOOLEAN NOT NULL DEFAULT TRUE;
