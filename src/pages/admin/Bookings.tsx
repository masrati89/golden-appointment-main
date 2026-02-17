import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatHebrewDate } from '@/lib/dateHelpers';
import { Input } from '@/components/ui/input';

const statusLabels: Record<string, string> = {
  pending: 'ממתין',
  confirmed: 'מאושר',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  no_show: 'bg-muted text-muted-foreground',
};

const paymentLabels: Record<string, string> = {
  cash: 'מזומן',
  bank_transfer: 'העברה',
  bit: 'Bit',
  deposit_only: 'מקדמה',
  credit: 'אשראי',
};

export default function BookingsManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings', statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*, services:service_id(name)')
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const today = format(new Date(), 'yyyy-MM-dd');
      if (dateFilter === 'today') query = query.eq('booking_date', today);
      else if (dateFilter === 'week') query = query.gte('booking_date', format(startOfWeek(new Date()), 'yyyy-MM-dd'));
      else if (dateFilter === 'month') query = query.gte('booking_date', format(startOfMonth(new Date()), 'yyyy-MM-dd'));

      const { data } = await query;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
      const { error } = await supabase.from('bookings').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('הסטטוס עודכן');
    },
  });

  const filtered = searchQuery
    ? bookings?.filter(
        (b) =>
          b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.customer_phone?.includes(searchQuery)
      )
    : bookings;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">ניהול תורים</h1>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם או טלפון"
              className="pr-10 h-12 rounded-xl"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 rounded-xl border-2 border-input bg-background text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="confirmed">מאושר</option>
            <option value="completed">הושלם</option>
            <option value="cancelled">בוטל</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-12 px-4 rounded-xl border-2 border-input bg-background text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">כל התאריכים</option>
            <option value="today">היום</option>
            <option value="week">השבוע</option>
            <option value="month">החודש</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['תאריך', 'שעה', 'לקוח', 'שירות', 'מחיר', 'תשלום', 'סטטוס', 'פעולות'].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">טוען...</td>
                </tr>
              ) : !filtered?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">אין תורים</td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 text-sm">
                      {b.booking_date ? formatHebrewDate(new Date(b.booking_date + 'T00:00:00')) : ''}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{b.booking_time?.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm text-foreground">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{(b as any).services?.name}</td>
                    <td className="px-4 py-3 font-bold text-primary text-sm">₪{Number(b.total_price)}</td>
                    <td className="px-4 py-3 text-xs">{paymentLabels[b.payment_method || ''] || b.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[b.status || 'pending']}`}>
                        {statusLabels[b.status || 'pending']}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.status || 'pending'}
                        onChange={(e) => updateStatus.mutate({ id: b.id, status: e.target.value })}
                        className="text-xs px-2 py-1 rounded-lg border border-input bg-background min-h-[36px]"
                      >
                        <option value="pending">ממתין</option>
                        <option value="confirmed">אושר</option>
                        <option value="completed">הושלם</option>
                        <option value="cancelled">בוטל</option>
                        <option value="no_show">לא הגיע</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
