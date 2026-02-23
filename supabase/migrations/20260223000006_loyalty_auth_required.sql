-- ================================================================
-- Migration: Loyalty — Require Registered Customers (2026-02-23)
-- ================================================================
-- Patch on top of 20260223000005_loyalty_program.sql.
--
-- Changes:
--   1. customer_profiles — new table storing name/phone per auth user
--   2. customer_points   — add client_id column + unique constraint
--   3. coupons           — add client_id column + index
--   4. Updated RLS: authenticated users read their own points/coupons
--
-- After this migration, points are only awarded when booking.client_id
-- is NOT NULL (registered customer). Guest bookings earn nothing.
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. customer_profiles
-- Stores display name and phone for each registered customer.
-- Primary key = auth.users.id so one profile per Supabase auth user.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read and write their own profile only.
DROP POLICY IF EXISTS "customer_profiles_own" ON public.customer_profiles;
CREATE POLICY "customer_profiles_own" ON public.customer_profiles
  FOR ALL TO authenticated
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. customer_points — add client_id
-- NULLs are treated as distinct in PostgreSQL UNIQUE constraints,
-- so existing phone-only rows (client_id = NULL) do not conflict.
-- Only registered-customer rows (client_id IS NOT NULL) are unique.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.customer_points
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Unique constraint: one points row per (business, registered customer).
-- NULL client_id rows are allowed to coexist (legacy phone-based data).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_points_business_client_unique'
      AND conrelid = 'public.customer_points'::regclass
  ) THEN
    ALTER TABLE public.customer_points
      ADD CONSTRAINT customer_points_business_client_unique
      UNIQUE (business_id, client_id);
  END IF;
END$$;

-- Index for client_id lookups
CREATE INDEX IF NOT EXISTS idx_customer_points_client_id
  ON public.customer_points (business_id, client_id)
  WHERE client_id IS NOT NULL;

-- Allow authenticated users to read their own points row
DROP POLICY IF EXISTS "customer_points_own_select" ON public.customer_points;
CREATE POLICY "customer_points_own_select" ON public.customer_points
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. coupons — add client_id
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_client_id
  ON public.coupons (business_id, client_id)
  WHERE client_id IS NOT NULL;

-- Allow authenticated users to read their own coupons
DROP POLICY IF EXISTS "coupons_own_select" ON public.coupons;
CREATE POLICY "coupons_own_select" ON public.coupons
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());
