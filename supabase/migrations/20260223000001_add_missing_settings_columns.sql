-- Add missing columns to settings table that were not yet applied to remote DB

-- Social media links
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS show_instagram boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_facebook boolean DEFAULT false;

-- WhatsApp automation
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_api_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_admin_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_new_booking_template text,
  ADD COLUMN IF NOT EXISTS client_whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_client_confirmation_template text;
