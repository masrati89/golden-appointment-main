-- ============================================================
-- Full schema for Golden Appointment - run in Supabase SQL Editor
-- Creates all tables, RLS policies (read/write for all), and RPC
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ENUM
-- =====================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- TABLES (order matters for FKs)
-- =====================

-- 1. services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active, sort_order);

-- 2. settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  business_name TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_logo_url TEXT,
  background_image_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  secondary_color TEXT DEFAULT '#1F2937',
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

-- 3. bookings (FK -> services)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  google_calendar_event_id TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_phone);

-- 4. blocked_slots
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON public.blocked_slots(blocked_date);

-- 5. portfolio_images
CREATE TABLE IF NOT EXISTS public.portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 6. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  is_verified BOOLEAN DEFAULT false
);

-- 7. user_roles (links to Supabase Auth users - required for admin login)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL
);
-- Ensure unique constraint for ON CONFLICT in setup_admin.sql
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- 8. waiting_list (FK -> services)
CREATE TABLE IF NOT EXISTS public.waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  requested_date DATE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending'
);

-- =====================
-- RLS: Enable on all tables
-- =====================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- =====================
-- RLS POLICIES: Allow read and write for everyone (no auth required)
-- =====================

-- Drop any legacy policy names from previous migrations
DROP POLICY IF EXISTS "Public can read active services" ON public.services;
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow update settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can read bookings by phone" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can read blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Admins can insert blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Admins can delete blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Admins can read all services" ON public.services;
DROP POLICY IF EXISTS "Admins can insert services" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can read user_roles" ON public.user_roles;

-- services
DROP POLICY IF EXISTS "services_select" ON public.services;
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;
CREATE POLICY "services_select" ON public.services FOR SELECT USING (true);
CREATE POLICY "services_insert" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "services_update" ON public.services FOR UPDATE USING (true);
CREATE POLICY "services_delete" ON public.services FOR DELETE USING (true);

-- settings
DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;
CREATE POLICY "settings_select" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "settings_delete" ON public.settings FOR DELETE USING (true);

-- bookings
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "bookings_delete" ON public.bookings FOR DELETE USING (true);

-- blocked_slots
DROP POLICY IF EXISTS "blocked_slots_select" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_insert" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_update" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_delete" ON public.blocked_slots;
CREATE POLICY "blocked_slots_select" ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "blocked_slots_insert" ON public.blocked_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "blocked_slots_update" ON public.blocked_slots FOR UPDATE USING (true);
CREATE POLICY "blocked_slots_delete" ON public.blocked_slots FOR DELETE USING (true);

-- portfolio_images
DROP POLICY IF EXISTS "portfolio_images_select" ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_images_insert" ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_images_update" ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_images_delete" ON public.portfolio_images;
CREATE POLICY "portfolio_images_select" ON public.portfolio_images FOR SELECT USING (true);
CREATE POLICY "portfolio_images_insert" ON public.portfolio_images FOR INSERT WITH CHECK (true);
CREATE POLICY "portfolio_images_update" ON public.portfolio_images FOR UPDATE USING (true);
CREATE POLICY "portfolio_images_delete" ON public.portfolio_images FOR DELETE USING (true);

-- reviews
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE USING (true);

-- user_roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE USING (true);
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE USING (true);

-- waiting_list
DROP POLICY IF EXISTS "waiting_list_select" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_insert" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_update" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_delete" ON public.waiting_list;
CREATE POLICY "waiting_list_select" ON public.waiting_list FOR SELECT USING (true);
CREATE POLICY "waiting_list_insert" ON public.waiting_list FOR INSERT WITH CHECK (true);
CREATE POLICY "waiting_list_update" ON public.waiting_list FOR UPDATE USING (true);
CREATE POLICY "waiting_list_delete" ON public.waiting_list FOR DELETE USING (true);

-- =====================
-- Seed: one settings row and sample services (only if empty)
-- =====================
INSERT INTO public.settings (id, business_name, primary_color)
SELECT gen_random_uuid(), 'סטודיו אלגנט', '#D4AF37'
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);

-- Sample services (only if table is empty)
INSERT INTO public.services (name, description, duration_min, price, image_url, sort_order)
SELECT name, description, duration_min, price, image_url, sort_order
FROM (VALUES
  ('תספורת נשים'::text, 'תספורת מקצועית עם ייעוץ והתאמה אישית'::text, 60, 150.00, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80&auto=format'::text, 1),
  ('צביעה', 'צביעת שיער מלאה עם טיפול מזין', 120, 350.00, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format', 2),
  ('פדיקור ומניקור', 'טיפול מלא לציפורניים כפות הידיים והרגליים', 90, 180.00, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format', 3),
  ('איפור כלה', 'איפור מקצועי לכלה ליום החתונה', 120, 500.00, 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80&auto=format', 4),
  ('הארכת ריסים', 'הארכת ריסים בשיטת נפח רוסי', 150, 280.00, 'https://images.unsplash.com/photo-1583001931096-959e65f5346f?w=800&q=80&auto=format', 5)
) AS t(name, description, duration_min, price, image_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1);

-- =====================
-- RPC: update_settings (bypasses schema cache for settings update)
-- =====================
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
  IF settings_id IS NULL THEN RAISE EXCEPTION 'Missing settings id'; END IF;

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

-- has_role: used for admin permission checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =====================
-- ADMIN LOGIN SETUP
-- =====================
-- To enable admin login:
--
-- 1. In Supabase: Authentication -> Users -> Add user (or sign up)
--    Create a user with email + password.
--
-- 2. Copy the user's UUID from the Users table.
--
-- 3. Run this SQL (replace YOUR_USER_UUID with the actual UUID):
--
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('YOUR_USER_UUID', 'admin')
--    ON CONFLICT (user_id, role) DO NOTHING;
--
-- 4. Login at /admin/login with that email and password.
