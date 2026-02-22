import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AppLoader } from '@/components/AppLoader';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BottomNav from '@/components/BottomNav';

const LOADING_FALLBACK_MS = 4000;

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const hasRedirected = useRef(false);

  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    navigate('/admin/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        hasRedirected.current = true;
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(result.error || 'שגיאה בהתחברות');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת המייל');
    } finally {
      setForgotLoading(false);
    }
  };

  const showLoadingSpinner = isLoading && !loadingTimedOut;
  if (showLoadingSpinner) {
    return <AppLoader />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 pb-[72px]"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
    >
      <motion.div
        className="glass-card p-8 w-full max-w-md shadow-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-center mb-8 text-foreground">כניסת מנהל</h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              אימייל <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="h-14 text-base rounded-xl border-2 pr-12"
                dir="ltr"
                required
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              סיסמה <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                className="h-14 text-base rounded-xl border-2 pl-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" />מתחבר...</>
            ) : (
              'כניסה למערכת'
            )}
          </button>
        </form>

        {!forgotMode ? (
          <div className="text-center mt-6 space-y-2">
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(''); }}
              className="text-sm text-primary hover:underline"
            >
              שכחתי סיסמה
            </button>
            <p className="text-sm text-muted-foreground">אין לך גישה? פנה לבעל העסק</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {!forgotSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">הכנס את האימייל שלך ונשלח לך קישור לאיפוס סיסמה</p>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="האימייל שלך"
                  className="h-12 rounded-xl border-2"
                  dir="ltr"
                  required
                />
                {error && <p className="text-destructive text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלח קישור'}
                </button>
                <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-muted-foreground hover:underline">
                  חזרה להתחברות
                </button>
              </form>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-green-600 font-semibold">✅ הקישור נשלח!</p>
                <p className="text-sm text-muted-foreground">בדוק את תיבת הדואר שלך ולחץ על הקישור לאיפוס הסיסמה</p>
                <button type="button" onClick={() => { setForgotMode(false); setForgotSent(false); }} className="text-sm text-primary hover:underline">
                  חזרה להתחברות
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <BottomNav />
    </div>
  );
}
