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
    if (initDone.current) {
      console.log('[Mobile Debug] ClientAuthContext: Already initialized, skipping');
      return;
    }
    initDone.current = true;

    console.log('[Mobile Debug] ClientAuthContext: Starting initialization');
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      console.log('[Mobile Debug] ClientAuthContext: Loading timeout reached');
      setIsLoading(false);
    }, 3000);

    async function initSession() {
      try {
        console.log('[Mobile Debug] ClientAuthContext: Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (cancelled) {
          console.log('[Mobile Debug] ClientAuthContext: Cancelled during session check');
          return;
        }
        
        if (error) {
          console.error('[Mobile Debug] ClientAuthContext: Session check error:', error);
          return;
        }
        
        if (session?.user) {
          console.log('[Mobile Debug] ClientAuthContext: Session found, user:', session.user.email);
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          console.log('[Mobile Debug] ClientAuthContext: No session found');
        }
      } catch (err) {
        console.error('[Mobile Debug] ClientAuthContext: Exception during initSession:', err);
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
          console.log('[Mobile Debug] ClientAuthContext: Initialization complete');
        }
      }
    }

    initSession();

    // Handle magic link callback - will be handled by AuthCallback component
    // This is just for session initialization

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Mobile Debug] ClientAuthContext: Auth state change:', event, session?.user?.email || 'no user');
      
      if (event === 'INITIAL_SESSION') {
        console.log('[Mobile Debug] ClientAuthContext: Ignoring INITIAL_SESSION event');
        return;
      }
      
      if (!session?.user) {
        // Session ended (logout or expired)
        console.log('[Mobile Debug] ClientAuthContext: Session ended, clearing state');
        setUser(null);
        setIsAuthenticated(false);
        // Don't navigate here - let the component handle it
        // This prevents navigation loops and 404s
        return;
      }

      console.log('[Mobile Debug] ClientAuthContext: Setting authenticated user:', session.user.email);
      setUser(session.user);
      setIsAuthenticated(true);

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('[Mobile Debug] ClientAuthContext: Token refreshed');
        // Session refreshed, user stays logged in
      }
    });

    return () => {
      console.log('[Mobile Debug] ClientAuthContext: Cleaning up');
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
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      // Use window.location.href for full page reload to clear all state
      // Redirect to home page (/) instead of /login to avoid 404s
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, clear local state and redirect
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/';
    }
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
