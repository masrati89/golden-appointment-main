/**
 * useSettings
 * -----------
 * גרסה מעודכנת ל-SaaS — מקבלת businessId ומביאה הגדרות לפיו.
 * תומכת בשני מצבים:
 *   1. עמוד לקוח (/b/:slug) — מקבל businessId מה-BusinessContext
 *   2. עמוד אדמין — מקבל את ה-businessId של המשתמש המחובר
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSettings = (businessId?: string | null) => {
  return useQuery({
    queryKey: ['settings', businessId ?? 'first'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // אם יש businessId — שלוף לפיו
      if (businessId) {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle();

        if (error) throw error;
        return data;
      }

      // Fallback: שורה ראשונה (לעמודים ישנים שעדיין לא עודכנו)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};
