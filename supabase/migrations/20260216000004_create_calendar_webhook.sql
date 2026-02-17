-- Create a function to call the Edge Function via HTTP
-- Note: This uses Supabase's pg_net extension for HTTP calls
CREATE OR REPLACE FUNCTION public.trigger_calendar_sync()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  function_url TEXT;
BEGIN
  -- Get Supabase URL from environment (or hardcode your project URL)
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Fallback: Extract from Supabase project settings
    -- In production, set this via: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
    supabase_url := 'https://your-project.supabase.co';
  END IF;
  
  function_url := supabase_url || '/functions/v1/sync-to-google-calendar';
  
  -- Call the Edge Function asynchronously (non-blocking)
  -- Using pg_net extension for HTTP requests
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'customer_name', NEW.customer_name,
        'customer_phone', NEW.customer_phone,
        'customer_email', NEW.customer_email,
        'booking_date', NEW.booking_date,
        'booking_time', NEW.booking_time,
        'notes', NEW.notes,
        'service_id', NEW.service_id,
        'status', NEW.status
      )
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the booking insertion
    RAISE WARNING 'Failed to trigger calendar sync: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on INSERT
DROP TRIGGER IF EXISTS on_booking_created_calendar_sync ON public.bookings;
CREATE TRIGGER on_booking_created_calendar_sync
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed') AND NEW.google_calendar_event_id IS NULL)
  EXECUTE FUNCTION public.trigger_calendar_sync();

-- Note: For production, you should use Supabase Database Webhooks instead of pg_net
-- Configure webhook in Supabase Dashboard:
-- 1. Go to Database > Webhooks
-- 2. Create new webhook
-- 3. Table: bookings
-- 4. Events: INSERT
-- 5. HTTP Request URL: https://your-project.supabase.co/functions/v1/sync-to-google-calendar
-- 6. HTTP Request Method: POST
-- 7. HTTP Request Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
