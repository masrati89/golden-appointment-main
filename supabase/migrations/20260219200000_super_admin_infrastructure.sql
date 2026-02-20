-- ============================================================
-- Migration: Super Admin Infrastructure
-- כולל: גיבוי, מניעת כפילויות, התראות מנוי, ביצועים
-- ============================================================

-- =====================
-- 1. גיבוי אוטומטי — audit_log
-- =====================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record   ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_business ON public.audit_log(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_time     ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_super_admin" ON public.audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE OR REPLACE FUNCTION public.audit_bookings_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(table_name, record_id, operation, old_data, business_id)
    VALUES ('bookings', OLD.id, 'DELETE', to_jsonb(OLD), OLD.business_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log(table_name, record_id, operation, old_data, new_data, business_id)
    VALUES ('bookings', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.business_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(table_name, record_id, operation, new_data, business_id)
    VALUES ('bookings', NEW.id, 'INSERT', to_jsonb(NEW), NEW.business_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS bookings_audit_trigger ON public.bookings;
CREATE TRIGGER bookings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_bookings_trigger();

-- =====================
-- 2. מניעת כפילויות בתורים
-- =====================
DROP INDEX IF EXISTS idx_bookings_no_double_booking;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_booking
  ON public.bookings(business_id, booking_date, booking_time)
  WHERE status IN ('confirmed', 'pending');

CREATE OR REPLACE FUNCTION public.create_booking_safe(
  p_business_id     UUID,
  p_service_id      UUID,
  p_booking_date    DATE,
  p_booking_time    TIME,
  p_customer_name   TEXT,
  p_customer_phone  TEXT,
  p_customer_email  TEXT DEFAULT NULL,
  p_client_id       UUID DEFAULT NULL,
  p_notes           TEXT DEFAULT NULL,
  p_total_price     NUMERIC DEFAULT 0,
  p_payment_method  TEXT DEFAULT 'cash',
  p_deposit_amount  NUMERIC DEFAULT 0
)
RETURNS TABLE(booking_id UUID, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_booking_id UUID;
  v_conflict_count INTEGER;
  v_service_duration INTEGER;
BEGIN
  SELECT duration_min INTO v_service_duration
  FROM public.services WHERE id = p_service_id;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  WHERE b.business_id = p_business_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('confirmed','pending')
    AND (
      b.booking_time < (p_booking_time + (v_service_duration || ' minutes')::interval)::time
      AND (b.booking_time + (s.duration_min || ' minutes')::interval)::time > p_booking_time
    );

  IF v_conflict_count > 0 THEN
    RETURN QUERY SELECT NULL::UUID, 'השעה תפוסה, אנא בחר שעה אחרת'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.bookings(
    business_id, service_id, booking_date, booking_time,
    customer_name, customer_phone, customer_email, client_id,
    notes, total_price, payment_method, deposit_amount, status
  ) VALUES (
    p_business_id, p_service_id, p_booking_date, p_booking_time,
    p_customer_name, p_customer_phone, p_customer_email, p_client_id,
    p_notes, p_total_price, p_payment_method, p_deposit_amount, 'pending'
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, NULL::TEXT;

EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT NULL::UUID, 'השעה תפוסה, אנא בחר שעה אחרת'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_safe TO anon, authenticated;

-- =====================
-- 3. התראות מנוי — subscription_alerts
-- =====================
CREATE TABLE IF NOT EXISTS public.subscription_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  alert_type  TEXT NOT NULL CHECK (alert_type IN ('expiring_soon','expired','payment_failed')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  details     JSONB
);

CREATE INDEX IF NOT EXISTS idx_sub_alerts_unresolved
  ON public.subscription_alerts(is_resolved, created_at DESC)
  WHERE is_resolved = false;

ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_alerts_super_admin" ON public.subscription_alerts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE OR REPLACE FUNCTION public.check_subscriptions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscription_alerts(business_id, alert_type, details)
  SELECT s.business_id, 'expiring_soon',
    jsonb_build_object('expires_at', s.current_period_end, 'days_left', EXTRACT(DAY FROM s.current_period_end - NOW()))
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.subscription_alerts sa
      WHERE sa.business_id = s.business_id AND sa.alert_type = 'expiring_soon' AND sa.is_resolved = false AND sa.created_at > NOW() - INTERVAL '7 days'
    );

  INSERT INTO public.subscription_alerts(business_id, alert_type, details)
  SELECT s.business_id, 'expired', jsonb_build_object('expired_at', s.current_period_end)
  FROM public.subscriptions s
  WHERE s.status = 'active' AND s.current_period_end < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.subscription_alerts sa
      WHERE sa.business_id = s.business_id AND sa.alert_type = 'expired' AND sa.is_resolved = false
    );

  UPDATE public.subscriptions SET status = 'past_due'
  WHERE status = 'active' AND current_period_end < NOW();
END;
$$;

-- =====================
-- 4. אינדקסים לביצועים
-- =====================
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON public.bookings(business_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp ON public.bookings(whatsapp_sent, business_id) WHERE whatsapp_sent = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end ON public.subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON public.businesses(is_active, created_at DESC);

-- =====================
-- 5. View: super_admin_overview
-- =====================
CREATE OR REPLACE VIEW public.super_admin_overview AS
SELECT
  (SELECT COUNT(*) FROM public.businesses WHERE is_active = true)          AS active_businesses,
  (SELECT COUNT(*) FROM public.businesses WHERE is_active = false)         AS inactive_businesses,
  (SELECT COUNT(*) FROM public.bookings WHERE booking_date = CURRENT_DATE AND status IN ('confirmed','pending')) AS bookings_today,
  (SELECT COUNT(*) FROM public.bookings WHERE DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', NOW()) AND status != 'cancelled') AS bookings_this_month,
  (SELECT COALESCE(SUM(total_price),0) FROM public.bookings WHERE DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', NOW()) AND status != 'cancelled') AS revenue_this_month,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status IN ('past_due') OR current_period_end < NOW()) AS expired_subscriptions,
  (SELECT COUNT(*) FROM public.subscription_alerts WHERE is_resolved = false) AS unresolved_alerts,
  (SELECT COUNT(*) FROM public.bookings WHERE whatsapp_sent = false AND status IN ('confirmed','pending') AND created_at > NOW() - INTERVAL '1 hour') AS whatsapp_pending;
