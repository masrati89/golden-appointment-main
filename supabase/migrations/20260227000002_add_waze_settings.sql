-- Waze navigation link for client-facing business page
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS show_waze  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waze_url   TEXT;
