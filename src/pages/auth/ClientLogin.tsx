import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Mail, Loader2, AlertCircle, CheckCircle, Sparkles, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import { hasPendingBookingState } from '@/lib/bookingState';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const { sendMagicLink, isAuthenticated, isLoading, resendCooldown } = useClientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next') || null;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Priority: next param > pending booking > location state > default dashboard
      const redirectTo = nextParam 
        ? nextParam
        : hasPendingBookingState() 
          ? '/booking-menu' // Restore booking flow
          : location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location, nextParam]);

  // Real-time email validation
  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('כתובת אימייל לא תקינה');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Use next param if available, otherwise use default
      const redirectTo = nextParam || (hasPendingBookingState() ? '/booking-menu' : '/dashboard');
      const result = await sendMagicLink(email, redirectTo);
      if (result.success) {
        setLinkSent(true);
        toast.success('קישור נשלח לאימייל שלך', {
          description: 'בדוק את תיבת הדואר הנכנס ולחץ על הקישור להתחברות',
          duration: 5000,
        });
      } else {
        setEmailError(result.error || 'שגיאה בשליחת הקישור');
        toast.error('שגיאה בשליחת הקישור', {
          description: result.error || 'נסה שוב מאוחר יותר',
        });
      }
    } catch (err: any) {
      setEmailError('שגיאה לא צפויה');
      toast.error('שגיאה לא צפויה', {
        description: err?.message || 'נסה שוב מאוחר יותר',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    await handleSubmit(new Event('submit') as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100svh] flex flex-col items-center justify-center px-4 pb-safe pt-4"
      dir="rtl"
      style={{ 
        background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)',
      }}
    >
      {/* Home Button */}
      <div className="w-full max-w-md mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          <span>חזרה לדף הבית</span>
        </button>
      </div>

      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg"
        >
          <Sparkles className="w-8 h-8 text-primary" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-foreground">ברוכים הבאים</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {linkSent ? 'קישור התחברות נשלח לאימייל שלך' : 'התחברו עם קישור קסם - ללא סיסמה'}
        </p>

        {linkSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">
                    קישור נשלח בהצלחה!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    בדוק את תיבת הדואר הנכנס שלך (<strong>{email}</strong>) ולחץ על הקישור להתחברות.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                לא קיבלת את הקישור?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSubmitting}
                className="w-full h-12 rounded-xl border-2 border-primary text-primary hover:bg-primary/5 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    שולח...
                  </>
                ) : resendCooldown > 0 ? (
                  `נסה שוב בעוד ${resendCooldown} שניות`
                ) : (
                  'שלח קישור חדש'
                )}
              </button>
              <button
                onClick={() => {
                  setLinkSent(false);
                  setEmail('');
                }}
                className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                שנה כתובת אימייל
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">
                כתובת אימייל <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateEmail(email)}
                  placeholder="your@email.com"
                  className={`h-12 text-base rounded-xl border-2 pr-12 ${
                    emailError ? 'border-destructive focus:border-destructive' : ''
                  }`}
                  dir="ltr"
                  required
                  autoFocus
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              {emailError && (
                <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !!emailError}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  שולח קישור...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  שלח קישור התחברות
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              הקישור יפתח את האפליקציה ויחבר אותך אוטומטית
            </p>
          </form>
        )}
      </motion.div>
      <BottomNav />
    </div>
  );
}
