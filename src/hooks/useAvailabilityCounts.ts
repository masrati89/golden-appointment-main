import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths, addDays } from 'date-fns';

/**
 * Efficiently fetches booking counts per date for the visible month range.
 * Uses a single query - only fetches booking_date, no full rows.
 * Returns Map of date string (yyyy-MM-dd) -> count of confirmed/pending bookings.
 */
export function useAvailabilityCounts(
  serviceId: string | null,
  startDate: Date,
  endDate: Date,
) {
  return useQuery({
    queryKey: [
      'availability-counts',
      serviceId ?? 'none',
      format(startDate, 'yyyy-MM'),
      format(endDate, 'yyyy-MM'),
    ],
    queryFn: async () => {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .gte('booking_date', startStr)
        .lte('booking_date', endStr)
        .in('status', ['confirmed', 'pending'])
        .limit(2000);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = row.booking_date as string;
        counts[d] = (counts[d] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!serviceId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
