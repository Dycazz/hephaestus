-- Rename provider-specific column names to neutral names
-- after migrating from Twilio to Telnyx

ALTER TABLE organizations RENAME COLUMN twilio_phone_number TO sms_phone_number;
ALTER TABLE sms_messages  RENAME COLUMN twilio_sid           TO provider_sid;
