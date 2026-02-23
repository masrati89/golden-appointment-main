-- ================================================================
-- Migration: Loyalty Program & Coupons System
-- ================================================================
-- NOTE: This codebase uses settings.admin_user_id (not businesses.owner_id)
-- for tenant ownership. RLS policies use the existing get_my_business_id()
-- SECURITY DEFINER helper (created in 20260222000000_fix_rls_tenant_isolation.sql).
-- All statements are idempotent (safe to re-run).
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- Table: loyalty_programs
-- One row per business. Controls whether the program is active
-- and the rules for earning/redeeming points.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  points_per_booking  INT         NOT NULL DEFAULT 10,
  points_for_reward   INT         NOT NULL DEFAULT 100,
  reward_description  TEXT        NOT NULL DEFAULT 'הנחה מיוחדת ללקוח נאמן',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id)
);

-- ─────────────────────────────────────────────────────────────
-- Table: customer_points
-- Accumulated points per (business_id, customer_phone).
-- Written ONLY by the award-points Edge Function (service_role).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_points (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_phone  TEXT        NOT NULL,
  total_points    INT         NOT NULL DEFAULT 0,
  total_bookings  INT         NOT NULL DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, customer_phone)
);

-- ─────────────────────────────────────────────────────────────
-- Table: coupons
-- Auto-generated when a customer reaches points_for_reward.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_phone       TEXT        NOT NULL,
  code                 TEXT        NOT NULL UNIQUE,
  discount_description TEXT        NOT NULL,
  is_used              BOOLEAN     NOT NULL DEFAULT false,
  used_at              TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes for query performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business
  ON public.loyalty_programs (business_id);

CREATE INDEX IF NOT EXISTS idx_customer_points_business
  ON public.customer_points (business_id);

CREATE INDEX IF NOT EXISTS idx_customer_points_phone
  ON public.customer_points (business_id, customer_phone);

CREATE INDEX IF NOT EXISTS idx_coupons_business
  ON public.coupons (business_id);

CREATE INDEX IF NOT EXISTS idx_coupons_phone
  ON public.coupons (business_id, customer_phone);

CREATE INDEX IF NOT EXISTS idx_coupons_code
  ON public.coupons (code);

-- ─────────────────────────────────────────────────────────────
-- RLS: loyalty_programs
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

-- Authenticated admin: full access to their own business's program
DROP POLICY IF EXISTS "loyalty_programs_owner_all" ON public.loyalty_programs;
CREATE POLICY "loyalty_programs_owner_all" ON public.loyalty_programs
  FOR ALL TO authenticated
  USING    (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- Anon: read-only access (required for public loyalty page)
DROP POLICY IF EXISTS "loyalty_programs_public_select" ON public.loyalty_programs;
CREATE POLICY "loyalty_programs_public_select" ON public.loyalty_programs
  FOR SELECT TO anon
  USING (true);  -- always filtered by business_id in the query

-- ─────────────────────────────────────────────────────────────
-- RLS: customer_points
-- Points are INSERT/UPDATEd only by the Edge Function (service_role).
-- Clients/anon can only SELECT (for the public loyalty-check page).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;

-- Authenticated admin: read their own customers' points
DROP POLICY IF EXISTS "customer_points_owner_select" ON public.customer_points;
CREATE POLICY "customer_points_owner_select" ON public.customer_points
  FOR SELECT TO authenticated
  USING (business_id = get_my_business_id());

-- Anon: read-only (public loyalty page — query always filters by phone)
DROP POLICY IF EXISTS "customer_points_public_select" ON public.customer_points;
CREATE POLICY "customer_points_public_select" ON public.customer_points
  FOR SELECT TO anon
  USING (true);  -- always filtered by business_id + customer_phone in query

-- ─────────────────────────────────────────────────────────────
-- RLS: coupons
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Authenticated admin: full access to their own business's coupons
DROP POLICY IF EXISTS "coupons_owner_all" ON public.coupons;
CREATE POLICY "coupons_owner_all" ON public.coupons
  FOR ALL TO authenticated
  USING    (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- Anon: read-only (public loyalty page — query filters by phone + business_id)
DROP POLICY IF EXISTS "coupons_public_select" ON public.coupons;
CREATE POLICY "coupons_public_select" ON public.coupons
  FOR SELECT TO anon
  USING (true);  -- always filtered by business_id + customer_phone in query
