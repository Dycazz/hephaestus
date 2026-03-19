-- Enable Supabase Realtime for the appointments table so that
-- INSERT and UPDATE events are broadcast to connected clients.
-- This powers live dashboard updates and instant accounting page refresh.
alter publication supabase_realtime add table public.appointments;
