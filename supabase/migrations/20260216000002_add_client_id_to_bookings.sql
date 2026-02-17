-- Add client_id column to bookings table for RLS
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);

-- Update existing bookings: link by customer_email if user exists
UPDATE public.bookings b
SET client_id = au.id
FROM auth.users au
WHERE b.customer_email = au.email
  AND b.client_id IS NULL;

-- Enable RLS on bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bookings
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (client_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Users can insert their own bookings
CREATE POLICY "Users can insert own bookings"
ON public.bookings
FOR INSERT
WITH CHECK (client_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update own bookings"
ON public.bookings
FOR UPDATE
USING (client_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
