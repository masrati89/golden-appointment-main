-- ================================================================
-- Migration: Security Audit Fixes (2026-02-23)
-- Fixes: C-2, C-3, C-4, C-5, C-7, C-8, H-3
-- All statements are idempotent (safe to re-run).
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- C-7: Enable RLS on the `businesses` table
-- Previously had NO row-level security — any authenticated user
-- could enumerate all tenants on the platform.
--
-- Policy design:
--   SELECT: super_admin sees all; regular admin sees only their own business.
--   INSERT/UPDATE/DELETE: super_admin only.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
-- Super_admin: full read access to all businesses.
-- Regular admin: can only read their own business (needed by AdminAuthContext to fetch slug).
CREATE POLICY "businesses_select" ON public.businesses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
    OR
    id = (
      SELECT business_id FROM public.settings
      WHERE admin_user_id = auth.uid()
      LIMIT 1
    )
  );

-- All writes restricted to super_admin only.
DROP POLICY IF EXISTS "businesses_insert" ON public.businesses;
CREATE POLICY "businesses_insert" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "businesses_update" ON public.businesses;
CREATE POLICY "businesses_update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "businesses_delete" ON public.businesses;
CREATE POLICY "businesses_delete" ON public.businesses
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────
-- C-7: Enable RLS on the `subscriptions` table
-- Previously had NO row-level security — any admin could read
-- billing/subscription data for all tenants.
-- Only super_admin needs access to this table.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_super_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_super_admin" ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ─────────────────────────────────────────────────────────────
-- C-8: Restrict access to super_admin_overview view
-- The view bypasses RLS (runs as postgres/owner) and returns
-- platform-wide revenue, booking counts, and business stats.
-- We revoke direct SELECT access and wrap it in a SECURITY
-- DEFINER function that enforces the super_admin role check.
-- ─────────────────────────────────────────────────────────────
REVOKE SELECT ON public.super_admin_overview FROM anon, authenticated;
GRANT SELECT ON public.super_admin_overview TO service_role;

CREATE OR REPLACE FUNCTION public.get_super_admin_overview()
RETURNS TABLE (
  active_businesses   bigint,
  inactive_businesses bigint,
  bookings_today      bigint,
  bookings_this_month bigint,
  revenue_this_month  numeric,
  expired_subscriptions bigint,
  unresolved_alerts   bigint,
  whatsapp_pending    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin may call this function.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: super_admin role required';
  END IF;

  RETURN QUERY SELECT * FROM public.super_admin_overview;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_super_admin_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_super_admin_overview() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- C-2: Fix set_google_calendar_tokens
-- Previous version had NO WHERE clause — it updated the
-- google_calendar_refresh_token for EVERY business on the
-- platform whenever any one admin connected their calendar.
--
-- New version: accepts p_admin_user_id so it updates only the
-- settings row belonging to that specific admin user.
-- Also drop the old single-argument version to avoid confusion.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.set_google_calendar_tokens(TEXT);

CREATE OR REPLACE FUNCTION public.set_google_calendar_tokens(
  p_refresh_token  TEXT,
  p_admin_user_id  UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update ONLY the settings row owned by the specified admin user.
  UPDATE public.settings
  SET google_calendar_refresh_token = p_refresh_token,
      google_calendar_connected      = true,
      updated_at                     = now()
  WHERE admin_user_id = p_admin_user_id;
END;
$$;

-- Only callable by the Edge Function (service_role).
REVOKE EXECUTE ON FUNCTION public.set_google_calendar_tokens(TEXT, UUID) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_google_calendar_tokens(TEXT, UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- C-3: Fix disconnect_google_calendar
-- Previous version had NO WHERE clause — disconnecting one
-- business would clear Google Calendar for ALL businesses.
--
-- New version: uses auth.uid() to target only the calling
-- admin's own settings row.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.disconnect_google_calendar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear tokens only for the authenticated admin's own business.
  UPDATE public.settings
  SET google_calendar_refresh_token = NULL,
      google_calendar_connected      = false,
      updated_at                     = now()
  WHERE admin_user_id = auth.uid();
END;
$$;

-- Revoke anon access; only authenticated admins may disconnect.
REVOKE EXECUTE ON FUNCTION public.disconnect_google_calendar() FROM anon;
GRANT  EXECUTE ON FUNCTION public.disconnect_google_calendar() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- C-4: Fix get_settings() RPC
-- Previous version returned settings from a random business
-- (LIMIT 1 with no filter) and was also granted to anon.
--
-- New version: returns settings for the calling admin's own
-- business only, and revokes anon access.
-- DROP first because CREATE OR REPLACE cannot change return type.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_settings();
CREATE OR REPLACE FUNCTION public.get_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r   RECORD;
  out jsonb;
BEGIN
  -- Filter by the authenticated admin's user ID.
  SELECT * INTO r
  FROM public.settings
  WHERE admin_user_id = auth.uid()
  LIMIT 1;

  IF r IS NULL THEN
    RETURN NULL;
  END IF;

  out := to_jsonb(r);
  -- Never expose the Google Calendar refresh token to the client.
  out := out - 'google_calendar_refresh_token';
  RETURN out;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_settings() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_settings() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- C-5: Fix update_settings RPC
-- Previous version was SECURITY DEFINER with no ownership check.
-- Any authenticated user who knew any settings UUID could update
-- another tenant's configuration (payment methods, keys, etc.).
-- Also: previous version accepted stripe_secret_key from the
-- client — a secret that should never transit the browser.
--
-- New version: verifies the calling user owns the settings row
-- before applying any updates. stripe_secret_key is excluded.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_settings(jsonb);
CREATE OR REPLACE FUNCTION public.update_settings(data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_id        uuid;
  caller_business_id uuid;
  wd                 jsonb;
BEGIN
  settings_id := (data->>'id')::uuid;
  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Missing settings id';
  END IF;

  -- Ownership check: verify the calling user is the admin for this settings row.
  -- If the row does not belong to auth.uid(), raise an error immediately.
  SELECT business_id INTO caller_business_id
  FROM public.settings
  WHERE id = settings_id
    AND admin_user_id = auth.uid();

  IF caller_business_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: you do not own this settings row';
  END IF;

  -- Apply updates — stripe_secret_key intentionally excluded:
  -- it is a server-side secret and must never be sent from the browser.
  UPDATE public.settings SET
    admin_phone               = data->>'admin_phone',
    admin_calendar_email      = data->>'admin_calendar_email',
    background_image_url      = data->>'background_image_url',
    bank_account              = data->>'bank_account',
    bank_branch               = data->>'bank_branch',
    bank_name                 = data->>'bank_name',
    bit_business_name         = data->>'bit_business_name',
    bit_payment_url           = data->>'bit_payment_url',
    bit_phone_number          = data->>'bit_phone_number',
    business_address          = data->>'business_address',
    business_logo_url         = data->>'business_logo_url',
    business_name             = data->>'business_name',
    business_phone            = data->>'business_phone',
    deposit_fixed_amount      = (data->>'deposit_fixed_amount')::numeric,
    deposit_percentage        = (data->>'deposit_percentage')::integer,
    google_calendar_id        = data->>'google_calendar_id',
    is_deposit_active         = (data->>'is_deposit_active')::boolean,
    max_advance_days          = (data->>'max_advance_days')::integer,
    min_advance_hours         = (data->>'min_advance_hours')::integer,
    payment_bank_enabled      = (data->>'payment_bank_enabled')::boolean,
    payment_bit_enabled       = (data->>'payment_bit_enabled')::boolean,
    payment_cash_enabled      = (data->>'payment_cash_enabled')::boolean,
    payment_credit_enabled    = (data->>'payment_credit_enabled')::boolean,
    payment_stripe_enabled    = (data->>'payment_stripe_enabled')::boolean,
    primary_color             = data->>'primary_color',
    secondary_color           = data->>'secondary_color',
    send_confirmation_sms     = (data->>'send_confirmation_sms')::boolean,
    send_reminder_hours       = (data->>'send_reminder_hours')::integer,
    slot_duration_min         = (data->>'slot_duration_min')::integer,
    stripe_publishable_key    = data->>'stripe_publishable_key',
    whatsapp_api_token        = data->>'whatsapp_api_token',
    whatsapp_float_number     = data->>'whatsapp_float_number',
    working_hours_end         = CASE
      WHEN data->>'working_hours_end' IS NOT NULL AND data->>'working_hours_end' <> ''
      THEN (data->>'working_hours_end')::time ELSE NULL END,
    working_hours_start       = CASE
      WHEN data->>'working_hours_start' IS NOT NULL AND data->>'working_hours_start' <> ''
      THEN (data->>'working_hours_start')::time ELSE NULL END,
    instagram_url             = data->>'instagram_url',
    facebook_url              = data->>'facebook_url',
    show_instagram            = COALESCE((data->>'show_instagram')::boolean, false),
    show_facebook             = COALESCE((data->>'show_facebook')::boolean, false),
    updated_at                = now()
  WHERE id = settings_id;

  -- Update working_days array separately (jsonb array → integer[]).
  wd := data->'working_days';
  IF wd IS NOT NULL AND jsonb_typeof(wd) = 'array' THEN
    UPDATE public.settings
    SET working_days = ARRAY(SELECT (jsonb_array_elements_text(wd))::integer)
    WHERE id = settings_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- H-3: Add RLS policy so clients can cancel their own bookings
-- The existing bookings_update policy requires admin role.
-- Clients who cancel via ClientDashboard got a silent no-op —
-- the update returned 0 rows but showed a success toast.
--
-- This new permissive policy (OR-ed with the admin policy) allows
-- an authenticated client to set status = 'cancelled' on
-- bookings where client_id = their own auth.uid().
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_client_cancel" ON public.bookings;
CREATE POLICY "bookings_client_cancel" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (
    client_id = auth.uid()
    AND status = 'cancelled'  -- clients may only change their booking to cancelled
  );
