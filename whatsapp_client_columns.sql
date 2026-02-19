-- Add WhatsApp client notification columns to business_settings table
-- Run this SQL in Supabase SQL Editor

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS client_whatsapp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_client_confirmation_template TEXT DEFAULT 'היי {{name}} שריינו לך את התור! 🌸
סוג טיפול: {{service}}
מתי? {{date}}
מחכות לראותך!';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'business_settings'
  AND column_name IN ('client_whatsapp_enabled', 'whatsapp_client_confirmation_template')
ORDER BY column_name;
