import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Mail, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

export default function AuthError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error') || 'unknown_error';
  const description = searchParams.get('description') || '';

  const getErrorDetails = () => {
    switch (error) {
      case 'expired_token':
      case 'token_expired':
        return {
          title: 'קישור פג תוקף',
          message: 'קישור ההתחברות ששלחנו פג תוקף. אנא בקש קישור חדש.',
          icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
        };
      case 'invalid_token':
      case 'invalid_link':
        return {
          title: 'קישור לא תקין',
          message: 'קישור ההתחברות לא תקין או שכבר נעשה בו שימוש.',
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
        };
      case 'session_error':
        return {
          title: 'שגיאת התחברות',
          message: description || 'אירעה שגיאה בעת יצירת ההתחברות. אנא נסה שוב.',
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
        };
      default:
        return {
          title: 'שגיאה בהתחברות',
          message: description || 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.',
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div
      className="min-h-[100svh] flex items-center justify-center px-4 pb-safe"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 100%) 100%)' }}
    >
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md shadow-xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center"
        >
          {errorDetails.icon}
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">{errorDetails.title}</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{errorDetails.message}</p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Mail className="w-5 h-5 ml-2" />
            שלח קישור חדש
          </Button>

          <Link to="/">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-2"
            >
              <Home className="w-5 h-5 ml-2" />
              חזרה לדף הבית
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          בעיות? צור קשר עם{' '}
          <a href="mailto:support@studioauthenti.com" className="text-primary hover:underline">
            התמיכה
          </a>
        </p>
      </motion.div>
      <BottomNav />
    </div>
  );
}
