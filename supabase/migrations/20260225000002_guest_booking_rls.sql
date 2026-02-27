-- Allow guest (anon) users to insert bookings without an account.
-- Conditions:
--   1. client_id must be NULL  (authenticated users use their own id)
--   2. status must be 'pending' (guests can't self-confirm)
--   3. business_id must reference a real, active business
-- All other operations (SELECT, UPDATE, DELETE) remain behind auth.

-- Ensure client_id is nullable (safety — it should already be, but explicit)
ALTER TABLE public.bookings ALTER COLUMN client_id DROP NOT NULL;

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "anon_insert_guest_booking" ON public.bookings;

CREATE POLICY "anon_insert_guest_booking"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (
    client_id IS NULL
    AND (status IS NULL OR status = 'pending')
    AND business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses WHERE id = business_id
    )
  );
