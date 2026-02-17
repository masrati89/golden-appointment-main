
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS payment_cash_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_bank_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_bit_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_credit_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bit_phone_number text,
  ADD COLUMN IF NOT EXISTS bit_business_name text,
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT 'לאומי',
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_account text;
