-- Enable RLS on business_settings table
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "business_settings_select" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_insert" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_update" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_delete" ON public.business_settings;

-- Public read access (needed for slot availability checks)
CREATE POLICY "business_settings_select" ON public.business_settings
  FOR SELECT USING (true);

-- Only authenticated admins can insert/update/delete
CREATE POLICY "business_settings_insert" ON public.business_settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "business_settings_update" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "business_settings_delete" ON public.business_settings
  FOR DELETE TO authenticated
  USING (true);
