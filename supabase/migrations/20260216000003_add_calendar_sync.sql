-- Add admin_calendar_email to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS admin_calendar_email TEXT;

-- Create calendar_sync_logs table for error tracking
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  error_message TEXT,
  google_event_id TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_booking ON public.calendar_sync_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_status ON public.calendar_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_created ON public.calendar_sync_logs(created_at DESC);
