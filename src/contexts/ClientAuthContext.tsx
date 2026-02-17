import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ClientAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resendCooldown: number;
}

const ClientAuthContext = createContext<ClientAuthContextType | null>(null);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(false);
    }, 3000);

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
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

    // Handle magic link callback - will be handled by AuthCallback component
    // This is just for session initialization

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      
      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      setUser(session.user);
      setIsAuthenticated(true);

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, user stays logged in
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const sendMagicLink = async (email: string, redirectTo?: string) => {
    try {
      // Build redirect URL: use provided redirectTo, or default to /auth/callback
      // If redirectTo is provided, append it as a query param so AuthCallback can use it
      const callbackUrl = redirectTo 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
          shouldCreateUser: true, // Allow new users to sign up
        },
      });

      if (error) {
        // Translate common errors to Hebrew
        let errorMessage = error.message;
        if (error.message.includes('rate limit')) {
          errorMessage = 'יותר מדי בקשות. אנא נסה שוב בעוד כמה דקות';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'כתובת אימייל לא תקינה';
        }
        return { success: false, error: errorMessage };
      }

      // Set 60 second cooldown
      setResendCooldown(60);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'שגיאה בשליחת קישור' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    // Navigation will be handled by the component using this hook
    window.location.href = '/login';
  };

  return (
    <ClientAuthContext.Provider value={{ isAuthenticated, isLoading, user, sendMagicLink, logout, resendCooldown }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) throw new Error('useClientAuth must be used within ClientAuthProvider');
  return context;
};
