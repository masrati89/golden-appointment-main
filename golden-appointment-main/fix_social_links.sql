-- ============================================================
-- Run this in Supabase: SQL Editor -> New query -> Paste -> Run
-- After running: Supabase may need to reload schema.
-- If save still fails: Project Settings -> General -> Restart project
-- ============================================================

-- Step 1: Create settings table ONLY if it does not exist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  business_name TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_logo_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  secondary_color TEXT DEFAULT '#1F2937',
  background_image_url TEXT,
  min_advance_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 30,
  slot_duration_min INTEGER DEFAULT 15,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '18:00',
  working_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4],
  is_deposit_active BOOLEAN DEFAULT true,
  deposit_percentage INTEGER DEFAULT 30,
  deposit_fixed_amount DECIMAL(10,2) DEFAULT 50,
  admin_phone TEXT,
  whatsapp_api_token TEXT,
  whatsapp_float_number TEXT,
  google_calendar_id TEXT,
  send_confirmation_sms BOOLEAN DEFAULT true,
  send_reminder_hours INTEGER DEFAULT 24,
  payment_cash_enabled BOOLEAN DEFAULT true,
  payment_bank_enabled BOOLEAN DEFAULT true,
  payment_bit_enabled BOOLEAN DEFAULT false,
  payment_credit_enabled BOOLEAN DEFAULT false,
  payment_stripe_enabled BOOLEAN DEFAULT false,
  bit_phone_number TEXT,
  bit_business_name TEXT,
  bit_payment_url TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account TEXT,
  stripe_publishable_key TEXT,
  stripe_secret_key TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  show_instagram BOOLEAN DEFAULT false,
  show_facebook BOOLEAN DEFAULT false
);

-- Enable RLS if table was just created (safe to run multiple times)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: allow public read (safe to run multiple times)
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings
  FOR SELECT USING (true);

-- Policy: allow update for authenticated or service role (adjust as needed)
DROP POLICY IF EXISTS "Allow update settings" ON public.settings;
CREATE POLICY "Allow update settings" ON public.settings
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Insert one row if table is empty (so the app has something to update)
INSERT INTO public.settings (id, business_name, primary_color)
SELECT gen_random_uuid(), 'סטודיו אלגנט', '#D4AF37'
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);

-- ============================================================
-- Step 2: If settings already existed, add missing columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'instagram_url') THEN
    ALTER TABLE public.settings ADD COLUMN instagram_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'facebook_url') THEN
    ALTER TABLE public.settings ADD COLUMN facebook_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'show_instagram') THEN
    ALTER TABLE public.settings ADD COLUMN show_instagram BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'show_facebook') THEN
    ALTER TABLE public.settings ADD COLUMN show_facebook BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'settings'
  AND column_name IN ('instagram_url', 'facebook_url', 'show_instagram', 'show_facebook')
ORDER BY column_name;

-- ============================================================
-- Step 3: Create RPC to update settings (bypasses schema cache)
-- ============================================================
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

GRANT EXECUTE ON FUNCTION public.update_settings(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.update_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_settings(jsonb) TO service_role;
