-- Create storage bucket for uploads (e.g. background images)
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read
CREATE POLICY "Public read uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');

-- Allow admins to upload
CREATE POLICY "Admins can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update/delete their uploads
CREATE POLICY "Admins can update uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete uploads" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'));
