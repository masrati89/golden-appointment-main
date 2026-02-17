
-- Add unique partial index to prevent double-booking at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_booking
ON public.bookings(booking_date, booking_time)
WHERE status IN ('confirmed', 'pending');
