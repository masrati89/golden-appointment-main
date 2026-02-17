import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches business_settings by id (Auth User ID).
 * Schema: business_settings.id = Auth User UID. No separate settings table.
 *
 * @param userId - Auth User ID. When provided (admin), queries .eq('id', userId).
 *                When omitted (public pages), fetches first row as fallback.
 */
export const useSettings = (userId?: string | null) => {
  return useQuery({
    queryKey: ['settings', userId ?? 'anonymous'],
    queryFn: async () => {
      try {
        if (userId) {
          const { data, error } = await supabase
            .from('business_settings')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          console.log('[useSettings] business_settings by id:', { userId, data, error });
          if (error) {
            console.error('[useSettings] Supabase error:', error.message, error.code, error.details);
            throw error;
          }
          if (!data) {
            console.log('[useSettings] No row found for user – user has no settings yet');
            return null;
          }
          return data as Record<string, unknown>;
        }

        // Fallback for public pages: fetch first row
        const { data, error } = await supabase
          .from('business_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        console.log('[useSettings] business_settings (first row):', { data, error });
        if (error) {
          console.error('[useSettings] Supabase error:', error.message, error.code, error.details);
          throw error;
        }
        return (data as Record<string, unknown>) ?? null;
      } catch (e) {
        console.warn('[useSettings] fetch failed', e);
        throw e;
      }
    },
  });
};
