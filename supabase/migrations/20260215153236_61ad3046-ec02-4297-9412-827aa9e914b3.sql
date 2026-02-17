
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS for user_roles
CREATE POLICY "Admins can read user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. blocked_slots table
CREATE TABLE public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_blocked_slots_date ON public.blocked_slots(blocked_date);

CREATE POLICY "Anyone can read blocked slots"
ON public.blocked_slots FOR SELECT USING (true);

CREATE POLICY "Admins can insert blocked slots"
ON public.blocked_slots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blocked slots"
ON public.blocked_slots FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin RLS for services (CRUD)
CREATE POLICY "Admins can read all services"
ON public.services FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert services"
ON public.services FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update services"
ON public.services FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete services"
ON public.services FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admin RLS for bookings (update/delete)
CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings"
ON public.bookings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Admin RLS for settings (update)
CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
