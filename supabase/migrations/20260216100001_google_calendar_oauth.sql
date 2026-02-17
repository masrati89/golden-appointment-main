-- Google Calendar OAuth: add columns and RPCs for one-click connect

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;

-- RPC: return settings for client (excludes refresh_token for security)
CREATE OR REPLACE FUNCTION public.get_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  out jsonb;
BEGIN
  SELECT * INTO r FROM public.settings LIMIT 1;
  IF r IS NULL THEN
    RETURN NULL;
  END IF;
  out := to_jsonb(r);
  out := out - 'google_calendar_refresh_token';
  RETURN out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_settings() TO service_role;

-- RPC: disconnect Google Calendar (clear token, set connected = false)
CREATE OR REPLACE FUNCTION public.disconnect_google_calendar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.settings
  SET google_calendar_refresh_token = NULL,
      google_calendar_connected = false,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO anon;
GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_google_calendar() TO service_role;

-- RPC: set Google Calendar tokens (called only by Edge Function with service role)
CREATE OR REPLACE FUNCTION public.set_google_calendar_tokens(p_refresh_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.settings
  SET google_calendar_refresh_token = p_refresh_token,
      google_calendar_connected = true,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_google_calendar_tokens(TEXT) TO service_role;

-- Ensure update_settings RPC includes admin_calendar_email (if missing)
CREATE OR REPLACE FUNCTION public.update_settings(data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_id uuid;
  wd jsonb;
BEGIN
  settings_id := (data->>'id')::uuid;
  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Missing settings id';
  END IF;

  UPDATE public.settings SET
    admin_phone = data->>'admin_phone',
    admin_calendar_email = data->>'admin_calendar_email',
    background_image_url = data->>'background_image_url',
    bank_account = data->>'bank_account',
    bank_branch = data->>'bank_branch',
    bank_name = data->>'bank_name',
    bit_business_name = data->>'bit_business_name',
    bit_payment_url = data->>'bit_payment_url',
    bit_phone_number = data->>'bit_phone_number',
    business_address = data->>'business_address',
    business_logo_url = data->>'business_logo_url',
    business_name = data->>'business_name',
    business_phone = data->>'business_phone',
    deposit_fixed_amount = (data->>'deposit_fixed_amount')::numeric,
    deposit_percentage = (data->>'deposit_percentage')::integer,
    google_calendar_id = data->>'google_calendar_id',
    is_deposit_active = (data->>'is_deposit_active')::boolean,
    max_advance_days = (data->>'max_advance_days')::integer,
    min_advance_hours = (data->>'min_advance_hours')::integer,
    payment_bank_enabled = (data->>'payment_bank_enabled')::boolean,
    payment_bit_enabled = (data->>'payment_bit_enabled')::boolean,
    payment_cash_enabled = (data->>'payment_cash_enabled')::boolean,
    payment_credit_enabled = (data->>'payment_credit_enabled')::boolean,
    payment_stripe_enabled = (data->>'payment_stripe_enabled')::boolean,
    primary_color = data->>'primary_color',
    secondary_color = data->>'secondary_color',
    send_confirmation_sms = (data->>'send_confirmation_sms')::boolean,
    send_reminder_hours = (data->>'send_reminder_hours')::integer,
    slot_duration_min = (data->>'slot_duration_min')::integer,
    stripe_publishable_key = data->>'stripe_publishable_key',
    stripe_secret_key = data->>'stripe_secret_key',
    whatsapp_api_token = data->>'whatsapp_api_token',
    whatsapp_float_number = data->>'whatsapp_float_number',
    working_hours_end = CASE WHEN data->>'working_hours_end' IS NOT NULL AND data->>'working_hours_end' <> '' THEN (data->>'working_hours_end')::time ELSE NULL END,
    working_hours_start = CASE WHEN data->>'working_hours_start' IS NOT NULL AND data->>'working_hours_start' <> '' THEN (data->>'working_hours_start')::time ELSE NULL END,
    instagram_url = data->>'instagram_url',
    facebook_url = data->>'facebook_url',
    show_instagram = COALESCE((data->>'show_instagram')::boolean, false),
    show_facebook = COALESCE((data->>'show_facebook')::boolean, false),
    updated_at = now()
  WHERE id = settings_id;

  wd := data->'working_days';
  IF wd IS NOT NULL AND jsonb_typeof(wd) = 'array' THEN
    UPDATE public.settings
    SET working_days = ARRAY(SELECT (jsonb_array_elements_text(wd))::integer)
    WHERE id = settings_id;
  END IF;
END;
$$;
