-- ================================================================
-- Migration: Fix 403 Forbidden on booking status UPDATE
-- ================================================================
-- ROOT CAUSE:
--   Migration 20260222000000 added clean RLS policies (bookings_update,
--   bookings_delete) but only dropped policies with THOSE EXACT names.
--   Three older policies with different names were never dropped and
--   remain active, creating a conflicting multi-policy RLS environment:
--
--     "Admins can update bookings"  → USING(has_role), no WITH CHECK
--     "Admins can delete bookings"  → USING(has_role), no WITH CHECK
--     "Users can update own bookings" → USING(client_id/email), no WITH CHECK
--
--   PostgreSQL evaluates WITH CHECK for ALL applicable permissive
--   policies, OR-ing the results. When the old policies' implicit
--   WITH CHECK (which defaults to their USING expression) returns
--   FALSE or NULL for a given row/caller combination, and the new
--   bookings_update WITH CHECK also fails (e.g. get_my_business_id()
--   returns a different value than expected), the overall WITH CHECK
--   evaluates to FALSE → PostgREST returns 403.
--
-- FIX:
--   1. Drop all stale old bookings UPDATE/DELETE policies.
--   2. Drop and re-create the clean policies from 20260222000000
--      (idempotent — DROP IF EXISTS + re-CREATE ensures a clean slate).
--   3. Keep bookings_client_cancel unchanged (correct and intentional).
--
-- All statements are idempotent (safe to re-run).
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- Step 1: Drop ALL stale old policies that were never cleaned up
-- ─────────────────────────────────────────────────────────────

-- From migration 20260215153236 — uses has_role(), no WITH CHECK
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

-- From migration 20260216000002 — uses client_id/customer_email, no WITH CHECK
-- This is overly permissive (lets clients set any status), superseded by bookings_client_cancel
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- ─────────────────────────────────────────────────────────────
-- Step 2: Re-create clean policies (drop first for clean slate)
-- ─────────────────────────────────────────────────────────────

-- Admin UPDATE: scoped strictly to the admin's own business
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING  (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- Admin DELETE: scoped strictly to the admin's own business
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE
  TO authenticated
  USING (business_id = get_my_business_id());

-- bookings_client_cancel is intentionally left unchanged:
-- it allows authenticated clients to set status = 'cancelled' on their own bookings.
-- (Created in migration 20260223000003, still correct.)

-- ─────────────────────────────────────────────────────────────
-- Step 3: Diagnostic — verify get_my_business_id() is populated
-- for all admin accounts. Run this manually if 403 persists:
--
--   SELECT
--     ur.user_id,
--     ur.role,
--     s.business_id,
--     s.admin_user_id,
--     s.admin_user_id IS NOT NULL AS settings_linked
--   FROM public.user_roles ur
--   LEFT JOIN public.settings s ON s.admin_user_id = ur.user_id
--   WHERE ur.role = 'admin';
--
-- If settings_linked = false for your admin, run:
--   UPDATE public.settings
--   SET admin_user_id = '<your-auth-user-uuid>'
--   WHERE business_id = '<your-business-id>';
-- ─────────────────────────────────────────────────────────────
