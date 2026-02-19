-- Add WhatsApp automation columns to business_settings table
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_api_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_api_token TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_admin_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_new_booking_template TEXT DEFAULT '💖 תור חדש נקבע במכון היופי!
👤 לקוחה: {{name}}
📱 טלפון: {{phone}}
💅 טיפול: {{service}}
📅 תאריך ושעה: {{date}}',
  ADD COLUMN IF NOT EXISTS client_whatsapp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_client_confirmation_template TEXT DEFAULT 'היי {{name}} שריינו לך את התור! 🌸
סוג טיפול: {{service}}
מתי? {{date}}
מחכות לראותך!';

-- Update existing whatsapp_api_token from settings if exists (migration helper)
DO $$
BEGIN
  -- If whatsapp_api_token exists in business_settings but is null, try to copy from settings
  UPDATE public.business_settings bs
  SET whatsapp_api_token = (
    SELECT whatsapp_api_token 
    FROM public.settings 
    WHERE whatsapp_api_token IS NOT NULL 
    LIMIT 1
  )
  WHERE bs.whatsapp_api_token IS NULL 
    AND EXISTS (SELECT 1 FROM public.settings WHERE whatsapp_api_token IS NOT NULL);
  
  -- Copy admin_phone to whatsapp_admin_phone if not set
  UPDATE public.business_settings bs
  SET whatsapp_admin_phone = (
    SELECT admin_phone 
    FROM public.settings 
    WHERE admin_phone IS NOT NULL 
    LIMIT 1
  )
  WHERE bs.whatsapp_admin_phone IS NULL 
    AND EXISTS (SELECT 1 FROM public.settings WHERE admin_phone IS NOT NULL);
END $$;
