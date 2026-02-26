-- Phase 2: Payment Integration — invoice tracking
-- Add invoice_url to bookings so the auto-generated receipt/invoice link
-- returned by Morning or Meshulam can be stored and displayed to admin/client.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS invoice_url TEXT;
