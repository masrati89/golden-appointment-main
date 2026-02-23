import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

const GOOGLE_AUTH_CALLBACK_URL = 'https://ylhazxbkaqhmhnbjopdj.supabase.co/functions/v1/google-calendar-callback';

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

interface GoogleSyncStatusProps {
  isConnected: boolean;
  user: User | null;
  isLoading: boolean;
  onDisconnected?: () => void;
  invalidateSettings?: () => void;
}

export function GoogleSyncStatus({
  isConnected,
  user,
  isLoading,
  onDisconnected,
  invalidateSettings,
}: GoogleSyncStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    if (!user?.id) {
      toast.error('User data not loaded');
      return;
    }

    // H-4: Include timestamp for CSRF validation in the callback.
    const state = btoa(
      JSON.stringify({
        origin: window.location.origin,
        admin_user_id: user.id,
        ts: Date.now(),
      })
    );

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', GOOGLE_AUTH_CALLBACK_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  };

  const handleDisconnectGoogle = async () => {
    if (!user?.id) return;
    setIsDisconnecting(true);
    try {
      // C-3: Use the RPC which scopes the update to auth.uid() — avoids wrong-table
      // and missing-filter bugs that previously existed here.
      const { error } = await supabase.rpc('disconnect_google_calendar');
      if (error) {
        toast.error('Failed to disconnect');
        return;
      }
      invalidateSettings?.();
      onDisconnected?.();
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking connection...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Google Calendar is synced.</span>
        </div>
        <Button
          onClick={handleDisconnectGoogle}
          disabled={isDisconnecting}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Disconnecting...
            </>
          ) : (
            'Disconnect Google Calendar'
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={!user?.id}
      className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
    >
      <GoogleIcon />
      <span className="mr-2">Connect Google Calendar</span>
    </Button>
  );
}
