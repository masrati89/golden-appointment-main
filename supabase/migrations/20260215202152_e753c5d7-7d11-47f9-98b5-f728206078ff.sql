
-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow anyone to read logos
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

-- Allow admins to upload logos
CREATE POLICY "Admins can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update logos
CREATE POLICY "Admins can update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete logos
CREATE POLICY "Admins can delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));
