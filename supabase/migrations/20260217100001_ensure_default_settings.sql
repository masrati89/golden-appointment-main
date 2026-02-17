-- Fallback: create default settings row if none exists.
-- get_settings returns settings row (id = settings.id). business_settings uses settings_id (FK to settings.id), NOT user_id.
CREATE OR REPLACE FUNCTION public.ensure_default_settings()
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
    INSERT INTO public.settings (business_name, primary_color)
    VALUES ('מעסק שלי', '#D4AF37')
    RETURNING * INTO r;
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

GRANT EXECUTE ON FUNCTION public.ensure_default_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_default_settings() TO service_role;
