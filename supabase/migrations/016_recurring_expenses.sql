-- Add recurrence support to expenses table
-- Values: 'none' (default), 'weekly', 'monthly', 'annually'
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none';
