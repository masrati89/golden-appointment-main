import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, eachDayOfInterval } from 'date-fns';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useSettings } from '@/hooks/useSettings';

type Period = 'week' | 'month' | 'year';

export default function AdminAnalytics() {
  const { user } = useAdminAuth();
  const { data: settings } = useSettings(user?.id);
  const businessId = settings?.business_id ?? null;
  const [period, setPeriod] = useState<Period>('month');

  const { data: stats } = useQuery({
    queryKey: ['admin-analytics', period, businessId],
    queryFn: async () => {
      const startDate =
        period === 'week'
          ? format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
          : period === 'month'
          ? format(startOfMonth(new Date()), 'yyyy-MM-dd')
          : format(startOfYear(new Date()), 'yyyy-MM-dd');

      const endDate = period === 'week'
        ? format(endOfWeek(new Date()), 'yyyy-MM-dd')
        : period === 'month'
          ? format(endOfMonth(new Date()), 'yyyy-MM-dd')
          : format(endOfYear(new Date()), 'yyyy-MM-dd');
      let bookingsQuery = supabase
        .from('bookings')
        .select('booking_date, total_price, status, payment_method, services:service_id(name)')
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .order('booking_date')
        .limit(2000);
      if (businessId) bookingsQuery = bookingsQuery.eq('business_id', businessId);
      const { data: bookings } = await bookingsQuery;

      if (!bookings) return null;

      const active = bookings.filter((b) => b.status !== 'cancelled');
      const totalRevenue = active.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const totalBookings = bookings.length;
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
      const completed = bookings.filter((b) => b.status === 'completed').length;
      const avgBooking = active.length > 0 ? totalRevenue / active.length : 0;

      const byService: Record<string, { count: number; revenue: number }> = {};
      bookings.forEach((b) => {
        const name = (b as any).services?.name || 'לא ידוע';
        if (!byService[name]) byService[name] = { count: 0, revenue: 0 };
        byService[name].count++;
        if (b.status !== 'cancelled') byService[name].revenue += Number(b.total_price || 0);
      });

      const byPayment: Record<string, number> = {};
      bookings.forEach((b) => {
        const method = b.payment_method || 'לא צוין';
        byPayment[method] = (byPayment[method] || 0) + 1;
      });

      const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
      const daily = last7.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayBookings = bookings.filter((b) => b.booking_date === dateStr);
        return {
          date: dateStr,
          label: format(day, 'dd/MM'),
          count: dayBookings.length,
          revenue: dayBookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + Number(b.total_price || 0), 0),
        };
      });

      return { totalRevenue, totalBookings, cancelled, completed, avgBooking, byService, byPayment, daily };
    },
  });

  const paymentLabels: Record<string, string> = {
    cash: 'מזומן',
    bank_transfer: 'העברה',
    bit: 'Bit',
    deposit_only: 'מקדמה',
    credit: 'אשראי',
  };

  const periodLabels: Record<Period, string> = {
    week: 'שבוע אחרון',
    month: 'חודש אחרון',
    year: 'שנה אחרונה',
  };

  if (!stats) return <div className="text-center py-12 text-muted-foreground">טוען...</div>;

  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-foreground">דוחות וסטטיסטיקות</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="h-12 px-4 rounded-xl border-2 border-input bg-background text-foreground text-sm focus:border-ring focus:ring-2 focus:ring-ring/20 min-h-[48px]"
        >
          {Object.entries(periodLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="סה״כ תורים" value={stats.totalBookings} icon={<Calendar className="w-5 h-5" />} />
        <MiniStat label="הכנסות" value={`₪${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
        <MiniStat label="ממוצע לתור" value={`₪${Math.round(stats.avgBooking)}`} icon={<TrendingUp className="w-5 h-5" />} />
        <MiniStat label="בוטלו" value={stats.cancelled} />
      </div>

      {/* Daily Chart */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-foreground mb-4">תורים - 7 ימים אחרונים</h3>
        <div className="flex items-end gap-2 h-40">
          {stats.daily.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-foreground">{day.count}</span>
              <div
                className="w-full bg-primary rounded-t-lg transition-all"
                style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? '8px' : '2px' }}
              />
              <span className="text-[10px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Service */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-foreground mb-4">שירותים פופולריים</h3>
        <div className="space-y-3">
          {Object.entries(stats.byService)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .map(([name, data]) => (
              <div key={name} className="flex items-center justify-between p-4 bg-secondary rounded-xl min-h-[56px]">
                <div>
                  <p className="font-semibold text-foreground text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{data.count} תורים</p>
                </div>
                <span className="font-bold text-primary text-lg">₪{data.revenue.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>

      {/* By Payment */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-foreground mb-4">לפי אמצעי תשלום</h3>
        <div className="space-y-2">
          {Object.entries(stats.byPayment).map(([method, count]) => (
            <div key={method} className="flex items-center justify-between p-4 bg-secondary rounded-xl min-h-[48px]">
              <span className="text-sm text-foreground">{paymentLabels[method] || method}</span>
              <span className="font-bold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
