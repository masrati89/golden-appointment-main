-- Add missing columns to settings table

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS admin_calendar_email text,
  ADD COLUMN IF NOT EXISTS admin_phone text,
  ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false;
