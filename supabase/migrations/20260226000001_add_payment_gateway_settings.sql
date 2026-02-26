-- Phase 1: Payment Gateway Settings (BYOG)
-- Adds gateway-specific columns to the settings table.
-- The existing deposit/stripe columns remain untouched.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS is_payment_required  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_type         TEXT    CHECK (payment_type IN ('full', 'deposit')),
  ADD COLUMN IF NOT EXISTS deposit_amount       NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_gateway      TEXT    CHECK (payment_gateway IN ('morning', 'meshulam')),
  ADD COLUMN IF NOT EXISTS morning_token        TEXT,
  ADD COLUMN IF NOT EXISTS meshulam_page_code   TEXT,
  ADD COLUMN IF NOT EXISTS meshulam_api_token   TEXT;
