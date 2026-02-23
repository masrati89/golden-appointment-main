/**
 * useSuperAdmin hooks
 * -------------------
 * כל הנתונים של ה-super admin panel.
 * כל hook מוגדר עם staleTime אופטימלי:
 *   - Overview stats: 60 שניות (משתנה לעיתים קרובות)
 *   - רשימת עסקים: 5 דקות (משתנה לעיתים רחוקות)
 *   - פרטי עסק בודד: 3 דקות
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  owner_id: string | null;
  subscription?: {
    status: string;
    plan: string;
    current_period_end: string;
  } | null;
  _bookings_count?: number;
}

export interface SuperAdminOverview {
  active_businesses: number;
  inactive_businesses: number;
  bookings_today: number;
  bookings_this_month: number;
  revenue_this_month: number;
  expired_subscriptions: number;
  unresolved_alerts: number;
  whatsapp_pending: number;
}

export interface SubscriptionAlert {
  id: string;
  created_at: string;
  business_id: string;
  alert_type: 'expiring_soon' | 'expired' | 'payment_failed';
  is_resolved: boolean;
  details: Record<string, unknown>;
  businesses?: { name: string; slug: string };
}

// ─── Overview Stats ───────────────────────────────────────────

export function useSuperAdminOverview() {
  return useQuery({
    queryKey: ['super-admin-overview'],
    staleTime: 60 * 1000,           // רענן כל דקה
    refetchInterval: 60 * 1000,
    queryFn: async (): Promise<SuperAdminOverview> => {
      // C-8: Access via SECURITY DEFINER RPC (enforces super_admin role server-side)
      // instead of querying the view directly (which bypasses RLS).
      const { data, error } = await supabase.rpc('get_super_admin_overview');
      if (error) throw error;
      return data as unknown as SuperAdminOverview;
    },
  });
}

// ─── Business List (עם pagination) ────────────────────────────

export function useBusinessList(page = 0, search = '') {
  const PAGE_SIZE = 20;

  return useQuery({
    queryKey: ['super-admin-businesses', page, search],
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // שמור נתונים ישנים בזמן טעינת עמוד חדש
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select(`
          id, name, slug, type, phone, is_active, created_at, notes, owner_id,
          subscriptions(status, plan, current_period_end)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        businesses: (data ?? []).map((b: any) => ({
          ...b,
          subscription: b.subscriptions?.[0] ?? null,
        })) as Business[],
        total: count ?? 0,
        pageSize: PAGE_SIZE,
      };
    },
  });
}

// ─── Business Detail ──────────────────────────────────────────

export function useBusinessDetail(businessId: string | null) {
  return useQuery({
    queryKey: ['super-admin-business', businessId],
    staleTime: 3 * 60 * 1000,
    enabled: !!businessId,
    queryFn: async () => {
      const [businessRes, statsRes] = await Promise.all([
        // פרטי עסק + הגדרות + מנוי
        supabase
          .from('businesses')
          .select(`
            *,
            subscriptions(*),
            settings(business_name, business_phone, working_hours_start, working_hours_end, slot_duration_min)
          `)
          .eq('id', businessId!)
          .single(),

        // סטטיסטיקות תורים
        supabase
          .from('bookings')
          .select('id, status, total_price, booking_date, whatsapp_sent')
          .eq('business_id', businessId!)
          .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      if (businessRes.error) throw businessRes.error;

      const bookings = statsRes.data ?? [];
      const active = bookings.filter((b) => b.status !== 'cancelled');

      return {
        business: businessRes.data,
        stats: {
          total_30d: bookings.length,
          revenue_30d: active.reduce((s, b) => s + Number(b.total_price || 0), 0),
          cancelled_30d: bookings.filter((b) => b.status === 'cancelled').length,
          whatsapp_sent: bookings.filter((b) => b.whatsapp_sent).length,
          whatsapp_failed: bookings.filter((b) => !b.whatsapp_sent && b.status !== 'cancelled').length,
        },
      };
    },
  });
}

// ─── Subscription Alerts ──────────────────────────────────────

export function useSubscriptionAlerts() {
  return useQuery({
    queryKey: ['super-admin-alerts'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubscriptionAlert[]> => {
      const { data, error } = await supabase
        .from('subscription_alerts')
        .select('*, businesses(name, slug)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SubscriptionAlert[];
    },
  });
}

// ─── Audit Log (גיבוי / היסטוריה) ────────────────────────────

export function useAuditLog(businessId: string, limit = 50) {
  return useQuery({
    queryKey: ['audit-log', businessId, limit],
    staleTime: 2 * 60 * 1000,
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useCreateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      type: string;
      phone: string;
      plan: 'basic' | 'pro';
    }) => {
      // 1. צור עסק
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({ name: input.name, slug: input.slug, type: input.type, phone: input.phone, is_active: true })
        .select()
        .single();
      if (bizError) throw bizError;

      // 2. צור settings ריקה
      await supabase.from('settings').insert({
        business_id: business.id,
        business_name: input.name,
        business_phone: input.phone,
      });

      // 3. צור מנוי
      await supabase.from('subscriptions').insert({
        business_id: business.id,
        status: 'active',
        plan: input.plan,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return business;
    },
    onSuccess: (business) => {
      qc.invalidateQueries({ queryKey: ['super-admin-businesses'] });
      qc.invalidateQueries({ queryKey: ['super-admin-overview'] });
      toast.success(`העסק "${business.name}" נוצר בהצלחה`);
    },
    onError: (err: any) => {
      if (err?.code === '23505') {
        toast.error('Slug זה כבר קיים — בחר כתובת אחרת');
      } else {
        toast.error('שגיאה ביצירת עסק: ' + (err?.message || 'שגיאה לא ידועה'));
      }
    },
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Business> & { id: string }) => {
      const { error } = await supabase.from('businesses').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['super-admin-business', vars.id] });
      qc.invalidateQueries({ queryKey: ['super-admin-businesses'] });
      toast.success('העסק עודכן');
    },
    onError: (err: any) => toast.error('שגיאה בעדכון: ' + err?.message),
  });
}

export function useToggleBusinessActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // מנע השבתה אם יש תורים פעילים בעתיד
      if (!is_active) {
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', id)
          .gte('booking_date', new Date().toISOString().split('T')[0])
          .in('status', ['confirmed', 'pending']);

        if ((count ?? 0) > 0) {
          throw new Error(`לעסק יש ${count} תורים עתידיים פעילים — בטל אותם קודם`);
        }
      }
      const { error } = await supabase.from('businesses').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['super-admin-businesses'] });
      qc.invalidateQueries({ queryKey: ['super-admin-overview'] });
      toast.success(vars.is_active ? 'העסק הופעל' : 'העסק הושבת');
    },
    onError: (err: any) => toast.error(err?.message || 'שגיאה'),
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, months = 1 }: { businessId: string; months?: number }) => {
      const newEnd = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', current_period_end: newEnd })
        .eq('business_id', businessId);
      if (error) throw error;

      // פתור התראות מנוי
      await supabase
        .from('subscription_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('business_id', businessId)
        .eq('is_resolved', false);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['super-admin-business', vars.businessId] });
      qc.invalidateQueries({ queryKey: ['super-admin-alerts'] });
      qc.invalidateQueries({ queryKey: ['super-admin-overview'] });
      toast.success('המנוי חודש בהצלחה');
    },
    onError: (err: any) => toast.error('שגיאה בחידוש מנוי: ' + err?.message),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('subscription_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-alerts'] });
      qc.invalidateQueries({ queryKey: ['super-admin-overview'] });
    },
  });
}
