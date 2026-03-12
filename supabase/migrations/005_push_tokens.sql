-- Add Expo push token storage to profiles
-- The mobile app writes its token here after requesting notification permission.
-- The web server reads it when sending push notifications.

alter table profiles
  add column if not exists expo_push_token text;

-- No RLS changes needed — existing profile policies cover this column.
