import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !error && !!data;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(false);
    }, 8000);

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const isAdmin = await checkIsAdmin(session.user.id);
          if (cancelled) return;
          if (isAdmin) {
            setUser(session.user);
            setIsAuthenticated(true);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      checkIsAdmin(session.user.id).then((isAdmin) => {
        if (isAdmin) {
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
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

    const isAdmin = await checkIsAdmin(data.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      return { success: false, error: 'אין לך הרשאות מנהל' };
    }

    setUser(data.user);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
