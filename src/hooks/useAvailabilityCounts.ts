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
      businessId ?? 'none',
    ],
    queryFn: async () => {
      // Security guard: businessId is mandatory for tenant isolation.
      // Without it we cannot scope the query to a single tenant — return empty instead of leaking cross-tenant data.
      if (!businessId) return {} as Record<string, number>;

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('business_id', businessId)
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
    // Only run when we have both a serviceId and a valid businessId
    enabled: !!serviceId && !!businessId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
