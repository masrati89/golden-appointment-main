-- Replace morning_token (single-field) with morning_api_key + morning_api_secret
-- Morning uses 2-step auth: POST /account/token → JWT → POST /payments/form

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS morning_api_key    TEXT,
  ADD COLUMN IF NOT EXISTS morning_api_secret TEXT;

-- Migrate any existing morning_token value into morning_api_key
-- (best-effort; the user will need to re-enter the secret separately)
UPDATE public.settings
  SET morning_api_key = morning_token
  WHERE morning_token IS NOT NULL;

ALTER TABLE public.settings
  DROP COLUMN IF EXISTS morning_token;
