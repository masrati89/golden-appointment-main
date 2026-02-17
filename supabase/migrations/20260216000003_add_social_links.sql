-- Add social media links fields to settings table
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS show_instagram boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_facebook boolean DEFAULT false;
