-- ============================================================
-- Migration: Fix RLS Tenant Isolation
-- ============================================================
-- PROBLEM: All existing RLS policies use USING(true) / WITH CHECK(true).
--   This means ANY user (anon or authenticated) can SELECT, INSERT,
--   UPDATE, or DELETE ANY row in ANY table regardless of business_id.
--   This is the confirmed root cause of the cross-tenant data leak.
--
-- SOLUTION:
--   1. Create a SECURITY DEFINER helper function that resolves the
--      current authenticated user's business_id from the settings table.
--   2. Keep SELECT policies public — required for the booking wizard
--      which runs as an anonymous user and must read services/settings
--      filtered by business_id at the application layer.
--   3. Restrict all write operations (INSERT, UPDATE, DELETE) on
--      tenant-owned tables to authenticated users acting on their
--      own business's rows only.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTION
-- get_my_business_id():
--   Returns the business_id owned by the currently authenticated user
--   by looking up settings.business_id WHERE admin_user_id = auth.uid().
--   SECURITY DEFINER runs with elevated privileges so it can read
--   settings even if the caller is a restricted role.
--   Returns NULL if called by anon or if no settings row is found.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS UUID
STABLE
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM public.settings
  WHERE admin_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_business_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_business_id() FROM anon;

-- ─────────────────────────────────────────────────────────────
-- TABLE: bookings
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — clients need to track their own bookings by phone.
--   Filtering by business_id + customer_phone is enforced at app layer.
-- INSERT: public — anonymous customers create bookings.
--   business_id in the payload is validated at app layer.
-- UPDATE/DELETE: authenticated only, scoped to the admin's own business.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: services
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — booking wizard needs to list services.
-- INSERT: authenticated only, must belong to the admin's own business.
-- UPDATE/DELETE: authenticated only, must target own business's rows.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;

CREATE POLICY "services_insert" ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "services_update" ON public.services
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "services_delete" ON public.services
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: settings
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — booking wizard reads settings by business_id.
-- INSERT: authenticated only (provisioning handled by create-admin-user Edge Function).
-- UPDATE: authenticated only, must target own business's settings row.
-- DELETE: authenticated only, must target own business's settings row.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_my_business_id() OR get_my_business_id() IS NULL);

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "settings_delete" ON public.settings
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: blocked_slots
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — booking wizard reads blocked slots to exclude times.
-- INSERT/UPDATE/DELETE: authenticated only, scoped to own business.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blocked_slots_insert" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_update" ON public.blocked_slots;
DROP POLICY IF EXISTS "blocked_slots_delete" ON public.blocked_slots;

CREATE POLICY "blocked_slots_insert" ON public.blocked_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "blocked_slots_update" ON public.blocked_slots
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "blocked_slots_delete" ON public.blocked_slots
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: portfolio_images
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — displayed on the public business landing page.
-- Write: authenticated only, scoped to own business.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "portfolio_images_insert" ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_images_update" ON public.portfolio_images;
DROP POLICY IF EXISTS "portfolio_images_delete" ON public.portfolio_images;

CREATE POLICY "portfolio_images_insert" ON public.portfolio_images
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "portfolio_images_update" ON public.portfolio_images
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "portfolio_images_delete" ON public.portfolio_images
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: reviews
-- ─────────────────────────────────────────────────────────────
-- SELECT: public — displayed on the public business landing page.
-- INSERT: public — customers submit reviews without logging in.
-- UPDATE/DELETE: authenticated only, scoped to own business.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;

CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: waiting_list
-- ─────────────────────────────────────────────────────────────
-- SELECT: authenticated only, scoped to own business.
-- INSERT: public — customers join the waiting list anonymously.
-- UPDATE/DELETE: authenticated only, scoped to own business.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "waiting_list_select" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_update" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_delete" ON public.waiting_list;

CREATE POLICY "waiting_list_select" ON public.waiting_list
  FOR SELECT
  TO authenticated
  USING (business_id = get_my_business_id());

CREATE POLICY "waiting_list_update" ON public.waiting_list
  FOR UPDATE
  TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "waiting_list_delete" ON public.waiting_list
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- ─────────────────────────────────────────────────────────────
-- TABLE: user_roles
-- ─────────────────────────────────────────────────────────────
-- SELECT: authenticated users can only read their own role record.
-- INSERT/UPDATE/DELETE: service_role only (managed by Edge Functions).
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

-- Each user can only read their own role — prevents role enumeration attacks
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Write access is reserved for service_role (Edge Functions, admin provisioning)
-- No authenticated or anon policies for INSERT/UPDATE/DELETE — only service_role bypasses RLS
