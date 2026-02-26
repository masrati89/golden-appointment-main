import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * SECURITY — רשימת עמודות מורשות לשליחה לדפדפן.
 *
 * stripe_secret_key מוחרג במפורש מכאן:
 *   - מדובר במפתח סודי שצריך להישמר אך ורק בצד השרת (Edge Functions).
 *   - שליחתו לדפדפן מאפשרת לכל משתמש עם DevTools לגנוב אותו ולחייב
 *     לקוחות, להחזיר תשלומים, ולגשת לחשבון Stripe המלא של העסק.
 *   - אם נדרש עדכון המפתח, זה נעשה דרך שדה נפרד ומוגן ב-Settings.tsx.
 */
const SAFE_SELECT = [
  'id',
  'admin_phone',
  'admin_calendar_email',
  'background_image_url',
  'bank_account',
  'bank_branch',
  'bank_name',
  'bit_business_name',
  'bit_payment_url',
  'bit_phone_number',
  'business_address',
  'business_logo_url',
  'business_name',
  'business_phone',
  'deposit_fixed_amount',
  'deposit_percentage',
  'google_calendar_id',
  'google_calendar_connected',
  'is_deposit_active',
  'max_advance_days',
  'min_advance_hours',
  'payment_bank_enabled',
  'payment_bit_enabled',
  'payment_cash_enabled',
  'payment_credit_enabled',
  'payment_stripe_enabled',
  'primary_color',
  'secondary_color',
  'send_confirmation_sms',
  'send_reminder_hours',
  'slot_duration_min',
  // stripe_publishable_key = מפתח ציבורי — בטוח לשלוח לדפדפן (מתחיל ב-pk_)
  'stripe_publishable_key',
  // stripe_secret_key — לעולם לא נשלח לדפדפן. מנוהל בנפרד ב-Settings.tsx
  'updated_at',
  'whatsapp_api_token',
  'whatsapp_api_url',
  'whatsapp_admin_phone',
  'whatsapp_float_number',
  'whatsapp_enabled',
  'whatsapp_new_booking_template',
  'client_whatsapp_enabled',
  'whatsapp_client_confirmation_template',
  'working_days',
  'working_hours_end',
  'working_hours_start',
  'instagram_url',
  'facebook_url',
  'show_instagram',
  'show_facebook',
  // ── Payment gateway (BYOG) ──────────────────────────────────────────
  // Admin-entered credentials needed to pre-populate the Payments settings page.
  // morning_api_key / morning_api_secret / meshulam_api_token are treated like
  // whatsapp_api_token: sensitive but required in the admin UI for display/edit.
  'is_payment_required',
  'payment_type',
  'deposit_amount',
  'payment_gateway',
  'morning_api_key',
  'morning_api_secret',
  'meshulam_page_code',
  'meshulam_api_token',
].join(',');

export const useSettings = (businessId?: string | null) => {
  return useQuery({
    queryKey: ['settings', businessId ?? 'auto'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // --- מסלול 1: דפים ציבוריים שמעבירים businessId במפורש (דף העסק, אשף ההזמנות) ---
      // המשמעות: הנתונים מסוננים תמיד לעסק הספציפי שביקשנו
      if (businessId) {
        const { data, error } = await supabase
          .from('settings')
          .select(SAFE_SELECT)
          .eq('business_id', businessId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      // --- מסלול 2: דפי Admin שמושכים הגדרות לפי המנהל המחובר ---
      // חייבים session תקין; אחרת — שגיאה מפורשת (ולא fallback לעסק שגוי)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        // אין session תקין — אין אפשרות לדעת לאיזה עסק המנהל שייך.
        // זריקת שגיאה מכוונת: ProtectedRoute ינתב את המשתמש לדף Login.
        // זה בטוח יותר מלהחזיר fallback שעלול לחשוף נתוני עסק אחר.
        throw new Error('NO_AUTH_SESSION: לא ניתן לטעון הגדרות ללא session מאומת');
      }

      const { data, error } = await supabase
        .from('settings')
        .select(SAFE_SELECT)
        .eq('admin_user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      // אם המשתמש מחובר אך לא נמצאו הגדרות — מחזירים null (לא fallback).
      // הממשק יציג הנחיה ליצור הגדרות, ולא נתוני עסק זר.
      return data ?? null;
    },
  });
};
