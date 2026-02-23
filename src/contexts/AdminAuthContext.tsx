import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * AdminAuthContextType
 * --------------------
 * מספק את פרטי המנהל המחובר לכל קומפוננטת Admin.
 *
 * שדה חדש: `businessId`
 *   - ה-ID הייחודי של העסק השייך למנהל המחובר.
 *   - נטען ישירות מטבלת `settings` מיד לאחר אימות, לפי admin_user_id.
 *   - מטרתו: לבטל את הצורך לגזור את ה-businessId מתוך settings בכל Hook בנפרד,
 *     וכך למנוע את הסכנה של fallback לעסק שגוי כאשר ה-Hook נטען לפני ה-session.
 *   - כל Hook שזקוק ל-businessId (useServices, useMonthAvailability וכו')
 *     יכול לקרוא אותו ישירות מ-useAdminAuth() — מקור אמת יחיד, מאובטח.
 */
interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  businessId: string | null;
  businessSlug: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

/**
 * checkIsAdmin
 * ------------
 * בודק בטבלת user_roles האם המשתמש הנוכחי הוא Admin.
 * מחזיר true בלבד אם ישנה שורה תואמת עם role='admin'.
 * שגיאת DB מוחזרת כ-false (fail-safe: אם לא ניתן לאמת — לא מאשרים).
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !error && !!data;
}

/**
 * fetchBusinessId
 * ---------------
 * מביא את ה-business_id של העסק השייך למנהל המחובר,
 * ישירות מטבלת settings לפי admin_user_id.
 *
 * חשוב: קוראים רק לעמודה אחת (business_id) — מינימום חשיפת נתונים.
 * מחזיר null אם לא נמצא, ומבצע log לצורכי דיבאג.
 */
async function fetchBusinessId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('business_id')
    .eq('admin_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[AdminAuth] Failed to fetch businessId for user:', userId, error.message);
    return null;
  }

  return (data as { business_id?: string | null } | null)?.business_id ?? null;
}

/**
 * fetchBusinessSlug
 * -----------------
 * מביא את ה-slug של העסק לפי business_id מטבלת businesses.
 * נטען בו-זמנית עם ה-businessId ב-authenticateUser().
 * מאפשר ניווט ישיר ל-/b/[slug] מכל חלק בפאנל המנהל.
 */
async function fetchBusinessSlug(businessId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', businessId)
    .maybeSingle();

  if (error) {
    console.error('[AdminAuth] Failed to fetch businessSlug for businessId:', businessId, error.message);
    return null;
  }

  return (data as { slug?: string | null } | null)?.slug ?? null;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);

  /**
   * authenticateUser
   * ----------------
   * פונקציית עזר פנימית: מקבלת User object, בודקת הרשאות Admin,
   * ומביאה את ה-businessId בפעולה אחת אטומית.
   * כך גם בטעינה הראשונה וגם ב-onAuthStateChange — הלוגיקה זהה ומרוכזת.
   */
  async function authenticateUser(authUser: User): Promise<boolean> {
    const isAdmin = await checkIsAdmin(authUser.id);
    if (!isAdmin) return false;

    const bid = await fetchBusinessId(authUser.id);
    // Fetch slug in parallel with businessId — both loaded atomically at login,
    // so every admin component has a stable slug immediately (no timing gap).
    const slug = bid ? await fetchBusinessSlug(bid) : null;
    setUser(authUser);
    setBusinessId(bid);
    setBusinessSlug(slug);
    setIsAuthenticated(true);
    return true;
  }

  /** ניקוי state — logout או session שפג */
  function clearAuthState() {
    setUser(null);
    setBusinessId(null);
    setBusinessSlug(null);
    setIsAuthenticated(false);
  }

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    // Timeout גיבוי: אם הבקשות לוקחות יותר מ-8 שניות, מסיימים loading
    // כדי למנוע מסך לבן אינסופי במקרי קצה (רשת איטית, Supabase down)
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(false);
    }, 8000);

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          await authenticateUser(session.user);
        }
      } catch (err) {
        // שגיאת רשת / Supabase — נשאר לא מחובר, לא קורסים
        console.error('[AdminAuth] Session init error:', err);
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    }

    initSession();

    // מאזין לשינויי auth בזמן אמת (login, logout, token refresh, expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION מטופל ב-initSession למעלה — מדלגים כדי למנוע כפילות
      if (event === 'INITIAL_SESSION') return;

      if (!session?.user) {
        // Session הסתיים: logout, פקיעת תוקף, או ביטול מחוץ לאפליקציה
        clearAuthState();
        // ניווט מופקד על ProtectedRoute — לא מנווטים כאן למניעת לולאות
        return;
      }

      // Session חודש / user התחבר — אמת מחדש ועדכן state
      authenticateUser(session.user).catch((err) => {
        console.error('[AdminAuth] onAuthStateChange auth error:', err);
        clearAuthState();
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: 'אימייל או סיסמה שגויים' };

    const success = await authenticateUser(data.user);
    if (!success) {
      // המשתמש קיים ב-Auth אך אינו Admin — מנתקים מייד
      await supabase.auth.signOut();
      return { success: false, error: 'אין לך הרשאות מנהל' };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, user, businessId, businessSlug, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
