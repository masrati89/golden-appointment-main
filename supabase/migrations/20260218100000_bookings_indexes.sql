-- Indexes for fast calendar and admin queries on bookings.
-- Run in Supabase SQL Editor or via migration.

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date_time ON public.bookings (booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status) WHERE status IN ('confirmed', 'pending', 'completed');
