import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSettings = (businessId?: string | null) => {
  return useQuery({
    queryKey: ['settings', businessId ?? 'auto'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (businessId) {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('admin_user_id', session.user.id)
          .maybeSingle();
        if (!error && data) return data;
      }

      // fallback
      const { data } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
};
