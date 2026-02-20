/**
 * useServices
 * -----------
 * גרסה מעודכנת ל-SaaS — מסננת שירותים לפי businessId.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useServices = (businessId?: string | null) => {
  return useQuery({
    queryKey: ['services', businessId ?? 'all'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!businessId, // לא מבצע fetch עד שיש businessId
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
