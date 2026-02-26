-- Hybrid Portfolio Gallery
-- Adds gallery toggle + URL arrays to the settings table.
-- custom_images  = URLs of files uploaded to Supabase Storage (business_gallery bucket)
-- instagram_urls = URLs of Instagram posts to embed (shown as iframes in the carousel)

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS show_gallery    BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_images   TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram_urls  TEXT[]    NOT NULL DEFAULT '{}';
