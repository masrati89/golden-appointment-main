-- Phase 2: Payment Integration — client side
-- payment_status already exists (DEFAULT 'pending').
-- Add transaction_id for storing the gateway's receipt/transaction reference.
-- Update default so new bookings without gateway payment default to 'not_required'.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Change the default to 'not_required' so guest/cash bookings are self-describing.
-- Existing rows keep their current value.
ALTER TABLE public.bookings
  ALTER COLUMN payment_status SET DEFAULT 'not_required';
