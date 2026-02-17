import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { hasPendingBookingState } from '@/lib/bookingState';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          // Redirect to error page
          navigate(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, { replace: true });
          return;
        }

        if (!accessToken || !refreshToken) {
          navigate('/auth/error?error=missing_tokens', { replace: true });
          return;
        }

        // Set session
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          navigate(`/auth/error?error=session_error&description=${encodeURIComponent(sessionError.message)}`, { replace: true });
          return;
        }

        if (session?.user) {
          // Success! Priority: next param > pending booking > default dashboard
          const hasPendingBooking = hasPendingBookingState();
          const redirectTo = nextParam 
            ? nextParam 
            : hasPendingBooking 
              ? '/booking-menu' 
              : '/dashboard';
          navigate(redirectTo, { replace: true });
        } else {
          navigate('/auth/error?error=no_session', { replace: true });
        }
      } catch (err: any) {
        navigate(`/auth/error?error=unexpected&description=${encodeURIComponent(err?.message || 'שגיאה לא צפויה')}`, { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">מתחבר...</p>
        <p className="text-xs text-muted-foreground/70">אנא המתן</p>
      </div>
    </div>
  );
}
