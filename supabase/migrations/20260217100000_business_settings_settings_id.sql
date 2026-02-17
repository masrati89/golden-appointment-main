-- Add settings_id to business_settings for per-business OAuth (multi-tenant ready)
-- OAuth callback uses state param with business_id (= settings.id) to know which row to update
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS settings_id UUID REFERENCES public.settings(id) ON DELETE CASCADE;

-- Link existing row to first settings row if any
UPDATE public.business_settings bs
SET settings_id = (SELECT id FROM public.settings LIMIT 1)
WHERE bs.settings_id IS NULL AND EXISTS (SELECT 1 FROM public.settings LIMIT 1);

-- RPC: save refresh_token. p_settings_id = business/settings to update (from OAuth state).
-- Deploy Edge Function with --no-verify-jwt (Google redirect has no Authorization header).
CREATE OR REPLACE FUNCTION public.set_business_google_tokens(p_refresh_token TEXT, p_settings_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_settings_id IS NOT NULL THEN
    UPDATE public.business_settings
    SET google_calendar_refresh_token = p_refresh_token,
        google_calendar_connected = true,
        updated_at = now()
    WHERE settings_id = p_settings_id;
    IF NOT FOUND THEN
      INSERT INTO public.business_settings (settings_id, google_calendar_refresh_token, google_calendar_connected)
      VALUES (p_settings_id, p_refresh_token, true);
    END IF;
  ELSE
    -- Fallback: update first row (single-tenant / legacy)
    UPDATE public.business_settings
    SET google_calendar_refresh_token = p_refresh_token,
        google_calendar_connected = true,
        updated_at = now()
    WHERE id = (SELECT id FROM public.business_settings LIMIT 1);
  END IF;
END;
$$;

-- get_settings: include google_calendar_connected from business_settings for this settings row
CREATE OR REPLACE FUNCTION public.get_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  out jsonb;
  connected boolean;
BEGIN
  SELECT * INTO r FROM public.settings LIMIT 1;
  IF r IS NULL THEN
    RETURN jsonb_build_object('google_calendar_connected', false);
  END IF;
  SELECT COALESCE(
    (SELECT bs.google_calendar_connected FROM public.business_settings bs WHERE bs.settings_id = r.id LIMIT 1),
    (SELECT bs.google_calendar_connected FROM public.business_settings bs WHERE bs.settings_id IS NULL LIMIT 1),
    false
  ) INTO connected;
  out := to_jsonb(r);
  out := out - 'google_calendar_refresh_token';
  out := out || jsonb_build_object('google_calendar_connected', connected);
  RETURN out;
END;
$$;

-- disconnect_google_calendar: accept optional settings_id to disconnect specific business
CREATE OR REPLACE FUNCTION public.disconnect_google_calendar(p_settings_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_settings_id IS NOT NULL THEN
    UPDATE public.business_settings
    SET google_calendar_refresh_token = NULL,
        google_calendar_connected = false,
        updated_at = now()
    WHERE settings_id = p_settings_id;
  ELSE
    UPDATE public.business_settings
    SET google_calendar_refresh_token = NULL,
        google_calendar_connected = false,
        updated_at = now();
  END IF;
END;
$$;
