import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, DollarSign, Users, Clock, TrendingUp } from 'lucide-react';
import { formatHebrewDate } from '@/lib/dateHelpers';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useSettings } from '@/hooks/useSettings';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-card p-6">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const { data: settings } = useSettings(user?.id);
  const businessId = settings?.business_id ?? null;
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: todayBookings } = useQuery({
    queryKey: ['admin-today-bookings', businessId],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*, services:service_id(name)')
        .eq('booking_date', today)
        .in('status', ['confirmed', 'pending'])
        .order('booking_time')
        .limit(100);
      if (businessId) query = query.eq('business_id', businessId);
      const { data } = await query;
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: monthStats } = useQuery({
    queryKey: ['admin-month-stats', businessId],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('total_price, customer_phone')
        .gte('booking_date', monthStart)
        .lte('booking_date', monthEnd)
        .in('status', ['confirmed', 'pending', 'completed'])
        .limit(2000);
      if (businessId) query = query.eq('business_id', businessId);
      const { data } = await query;

      const revenue = data?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) ?? 0;
      const uniqueCustomers = new Set(data?.map((b) => b.customer_phone)).size;
      return { revenue, customers: uniqueCustomers, total: data?.length ?? 0 };
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
        <p className="text-muted-foreground text-sm hidden sm:block">
          {formatHebrewDate(new Date())}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Calendar className="w-7 h-7" />} label="תורים היום" value={todayBookings?.length ?? 0} />
        <StatCard icon={<DollarSign className="w-7 h-7" />} label="הכנסות החודש" value={`₪${(monthStats?.revenue ?? 0).toLocaleString()}`} />
        <StatCard icon={<Users className="w-7 h-7" />} label="לקוחות החודש" value={monthStats?.customers ?? 0} />
        <StatCard icon={<TrendingUp className="w-7 h-7" />} label="תורים החודש" value={monthStats?.total ?? 0} />
      </div>

      {/* Today's bookings */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">תורים להיום</h2>
        {!todayBookings?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-14 h-14 mx-auto mb-3 opacity-30" />
            <p>אין תורים להיום</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl min-h-[64px]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary text-sm">
                      {booking.booking_time?.slice(0, 5)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{booking.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{(booking as any).services?.name}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">₪{Number(booking.total_price)}</p>
                  <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
