-- Per-appointment price override
-- NULL = derive revenue from service default at analytics time (backward-compatible)
-- 0    = explicitly free job ($0 revenue)
-- >0   = explicit price for this specific appointment
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price_cents integer;
