import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export const MAX_DAILY_APPOINTMENTS = 8;

export function useMonthAvailability(currentMonth: Date, businessId?: string | null) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['month-availability', format(currentMonth, 'yyyy-MM'), businessId ?? 'all'],
    queryFn: async (): Promise<string[]> => {
      let query = supabase
        .from('bookings')
        .select('booking_date')
        .gte('booking_date', startStr)
        .lte('booking_date', endStr)
        .in('status', ['confirmed', 'pending'])
        .limit(500);

      if (businessId) query = query.eq('business_id', businessId);

      const { data, error } = await query;
      if (error) throw error;

      const countByDate: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = row.booking_date as string;
        countByDate[d] = (countByDate[d] ?? 0) + 1;
      }

      return Object.entries(countByDate)
        .filter(([, count]) => count >= MAX_DAILY_APPOINTMENTS)
        .map(([dateStr]) => dateStr);
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
