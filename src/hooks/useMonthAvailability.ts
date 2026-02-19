import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/** Days with this many or more appointments are considered "full". */
export const MAX_DAILY_APPOINTMENTS = 8;

/**
 * Fetches appointments for the given month, aggregates by date, and returns
 * only the dates that are fully booked (count >= MAX_DAILY_APPOINTMENTS).
 * Use with isDateFull() for timezone-safe date comparison in the UI.
 */
export function useMonthAvailability(currentMonth: Date) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['month-availability', format(currentMonth, 'yyyy-MM')],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .gte('booking_date', startStr)
        .lte('booking_date', endStr)
        .in('status', ['confirmed', 'pending'])
        .limit(500);

      if (error) throw error;

      const countByDate: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = row.booking_date as string;
        countByDate[d] = (countByDate[d] ?? 0) + 1;
      }

      const fullDates = Object.entries(countByDate)
        .filter(([, count]) => count >= MAX_DAILY_APPOINTMENTS)
        .map(([dateStr]) => dateStr);

      return fullDates;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
