-- Add Stripe payment fields to settings table
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS payment_stripe_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
  ADD COLUMN IF NOT EXISTS stripe_secret_key text;

-- Add stripe_payment_intent_id and stripe_payment_status to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_status text;
