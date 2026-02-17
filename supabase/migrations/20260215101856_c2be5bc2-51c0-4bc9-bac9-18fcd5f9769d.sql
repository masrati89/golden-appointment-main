
-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Services Table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active, sort_order);

-- Create Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit', 'bank_transfer', 'deposit_only')),
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  google_calendar_event_id TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_phone);

-- Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'סטודיו היופי שלי',
  business_phone TEXT,
  business_address TEXT,
  business_logo_url TEXT,
  primary_color TEXT DEFAULT '#D4AF37',
  secondary_color TEXT DEFAULT '#1F2937',
  min_advance_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 30,
  slot_duration_min INTEGER DEFAULT 15,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '18:00',
  working_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4],
  is_deposit_active BOOLEAN DEFAULT true,
  deposit_percentage INTEGER DEFAULT 30,
  deposit_fixed_amount DECIMAL(10,2) DEFAULT 50,
  admin_phone TEXT,
  whatsapp_api_token TEXT,
  google_calendar_id TEXT,
  send_confirmation_sms BOOLEAN DEFAULT true,
  send_reminder_hours INTEGER DEFAULT 24,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Services: Public read for active
CREATE POLICY "Public can read active services" ON public.services
  FOR SELECT USING (is_active = true);

-- Settings: Public read
CREATE POLICY "Public can read settings" ON public.settings
  FOR SELECT USING (true);

-- Bookings: Public insert (for booking without auth in Phase 1)
CREATE POLICY "Anyone can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read bookings by phone" ON public.bookings
  FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.settings (business_name, primary_color)
VALUES ('סטודיו אלגנט', '#D4AF37');

-- Insert sample services
INSERT INTO public.services (name, description, duration_min, price, image_url, sort_order) VALUES
('תספורת נשים', 'תספורת מקצועית עם ייעוץ והתאמה אישית', 60, 150.00, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80&auto=format', 1),
('צביעה', 'צביעת שיער מלאה עם טיפול מזין', 120, 350.00, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format', 2),
('פדיקור ומניקור', 'טיפול מלא לציפורניים כפות הידיים והרגליים', 90, 180.00, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format', 3),
('איפור כלה', 'איפור מקצועי לכלה ליום החתונה', 120, 500.00, 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80&auto=format', 4),
('הארכת ריסים', 'הארכת ריסים בשיטת נפח רוסי', 150, 280.00, 'https://images.unsplash.com/photo-1583001931096-959e65f5346f?w=800&q=80&auto=format', 5);
