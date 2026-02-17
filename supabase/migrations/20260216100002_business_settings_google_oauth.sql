-- Table for OAuth tokens (per business). One row.
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_calendar_refresh_token TEXT,
  google_calendar_connected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure single row
INSERT INTO public.business_settings (id, google_calendar_connected)
SELECT gen_random_uuid(), false
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings LIMIT 1);

-- RPC: save refresh_token (Edge Function only - use service_role)
CREATE OR REPLACE FUNCTION public.set_business_google_tokens(p_refresh_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.business_settings
  SET google_calendar_refresh_token = p_refresh_token,
      google_calendar_connected = true,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_business_google_tokens(TEXT) TO service_role;

-- RPC: disconnect (clear token). Callable from client.
CREATE OR REPLACE FUNCTION public.disconnect_google_calendar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.business_settings
  SET google_calendar_refresh_token = NULL,
      google_calendar_connected = false,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO anon;
GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO service_role;

-- get_settings: include google_calendar_connected from business_settings
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
  SELECT COALESCE(
    (SELECT google_calendar_connected FROM public.business_settings LIMIT 1),
    false
  ) INTO connected;

  SELECT * INTO r FROM public.settings LIMIT 1;
  IF r IS NULL THEN
    RETURN jsonb_build_object('google_calendar_connected', connected);
  END IF;
  out := to_jsonb(r);
  out := out - 'google_calendar_refresh_token';
  out := out || jsonb_build_object('google_calendar_connected', connected);
  RETURN out;
END;
$$;
