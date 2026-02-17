-- Add reminder fields to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;
