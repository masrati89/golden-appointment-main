import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function useAvailabilityCounts(
  serviceId: string | null,
  startDate: Date,
  endDate: Date,
  businessId?: string | null,
) {
  return useQuery({
    queryKey: [
      'availability-counts',
      serviceId ?? 'none',
      format(startDate, 'yyyy-MM'),
      format(endDate, 'yyyy-MM'),
      businessId ?? 'all',
    ],
    queryFn: async () => {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      let query = supabase
        .from('bookings')
        .select('booking_date')
        .gte('booking_date', startStr)
        .lte('booking_date', endStr)
        .in('status', ['confirmed', 'pending'])
        .limit(2000);

      if (businessId) query = query.eq('business_id', businessId);

      const { data, error } = await query;
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
