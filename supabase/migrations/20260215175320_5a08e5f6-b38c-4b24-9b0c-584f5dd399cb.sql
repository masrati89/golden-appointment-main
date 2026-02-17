
-- Settings: add missing columns only
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_float_number TEXT;

-- Portfolio Gallery
CREATE TABLE IF NOT EXISTS portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT DEFAULT 'hair',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read portfolio" ON portfolio_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert portfolio" ON portfolio_images FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update portfolio" ON portfolio_images FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete portfolio" ON portfolio_images FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT false
);

-- Use a trigger instead of CHECK constraint for rating validation
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_review_rating
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update reviews" ON reviews FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON reviews FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Waiting List
CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  requested_date DATE NOT NULL,
  service_id UUID REFERENCES services(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending'
);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert waiting list" ON waiting_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own waiting list" ON waiting_list FOR SELECT USING (true);
CREATE POLICY "Admins can update waiting list" ON waiting_list FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete waiting list" ON waiting_list FOR DELETE USING (has_role(auth.uid(), 'admin'));
