import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, Tag, Download, Home, CheckCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useBusinessSafe } from '@/contexts/BusinessContext';
import { downloadICSFile } from '@/lib/calendar';
import { getHebrewDayName, formatHebrewDate } from '@/lib/dateHelpers';
import confetti from 'canvas-confetti';

interface BookingSuccessState {
  serviceName: string;
  serviceDuration: number;
  bookingDate: string; // yyyy-MM-dd
  bookingTime: string;
  totalPrice: number;
  customerName: string;
  depositAmount: number;
  paymentMethod: string;
  notes?: string;
}

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useClientAuth();
  const { business, businessId } = useBusinessSafe();
  const { data: settings } = useSettings(businessId);
  const confettiFired = useRef(false);

  const state = location.state as BookingSuccessState | null;

  // Fire confetti once on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#D4AF37', '#C5A572', '#FFD700', '#FFF9F2'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#D4AF37', '#C5A572', '#FFD700', '#FFF9F2'],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  // Redirect if no state
  if (!state) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-4" dir="rtl">
        <p className="text-muted-foreground mb-4">לא נמצאו פרטי הזמנה</p>
        <Button onClick={() => navigate('/')}>חזרה לדף הבית</Button>
      </div>
    );
  }

  const bookingDate = new Date(state.bookingDate + 'T00:00:00');
  const remaining = state.totalPrice - state.depositAmount;

  const handleDownloadCalendar = () => {
    downloadICSFile(
      {
        booking_date: state.bookingDate,
        booking_time: state.bookingTime,
        customer_name: state.customerName,
        total_price: state.totalPrice,
        deposit_amount: state.depositAmount,
        payment_method: state.paymentMethod,
        notes: state.notes,
      },
      { name: state.serviceName, duration_min: state.serviceDuration },
      {
        business_name: settings?.business_name,
        business_phone: settings?.business_phone,
        business_address: settings?.business_address,
      }
    );
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col justify-between overflow-hidden px-4 w-full max-w-sm mx-auto"
      dir="rtl"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 100%) 100%)',
        paddingTop: 'max(env(safe-area-inset-top), 3rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      {/* Top: checkmark + title — enough padding so V is not cut */}
      <div className="flex-shrink-0 pt-2 sm:pt-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative mb-3 sm:mb-4"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
            </div>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.5, repeat: 2, ease: 'easeOut' }}
          />
        </motion.div>

        <motion.h1
          className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          ההזמנה התקבלה!
        </motion.h1>
        <motion.p
          className="text-xs sm:text-sm text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {state.customerName}, תודה שבחרת בנו
        </motion.p>
      </div>

      {/* Middle: card + info — flex-grow, centered, scrollable only if needed */}
      <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto py-2 sm:py-4">
        <motion.div
          className="glass-card p-3 sm:p-5 w-full space-y-2 sm:space-y-3 flex-shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">תאריך ושעה</p>
              <p className="font-semibold text-foreground text-xs sm:text-sm truncate">
                יום {getHebrewDayName(bookingDate)}, {formatHebrewDate(bookingDate)} · {state.bookingTime.slice(0, 5)}
              </p>
            </div>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">טיפול</p>
              <p className="font-semibold text-foreground text-xs sm:text-sm truncate">{state.serviceName}</p>
            </div>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <p className="text-[10px] sm:text-xs text-muted-foreground">מחיר כולל</p>
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary flex-shrink-0">₪{state.totalPrice}</span>
          </div>
          {remaining > 0 && state.paymentMethod !== 'cash' && (
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              יתרה לתשלום: ₪{remaining}
            </p>
          )}
        </motion.div>

        <motion.div
          className="glass-card p-2.5 sm:p-3 w-full mt-2 sm:mt-3 text-right flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="font-semibold text-foreground text-[10px] sm:text-xs mb-0.5">⚠️ חשוב לדעת</p>
          <ul className="space-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
            <li>• הגיעו 5 דקות לפני השעה</li>
            <li>• ביטול - הודיעו 24 שעות מראש</li>
            {remaining > 0 && state.paymentMethod === 'cash' && (
              <li className="font-semibold">• זכרו להביא ₪{state.totalPrice} במזומן</li>
            )}
          </ul>
        </motion.div>
      </div>

      {/* Loyalty CTA — shown only for guest (unauthenticated) users */}
      {!isAuthenticated && business?.slug && (
        <motion.div
          className="glass-card p-3 w-full border border-primary/25 bg-primary/5 flex items-center justify-between gap-3 flex-shrink-0 mt-2 sm:mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Heart className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">צבר נקודות נאמנות</p>
              <p className="text-[10px] text-muted-foreground leading-tight">הרשם כדי לצבור נקודות על כל תור מאושר</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs whitespace-nowrap border-primary text-primary hover:bg-primary/10 flex-shrink-0"
            onClick={() =>
              navigate(
                `/auth/login?next=${encodeURIComponent(
                  `/register/customer?next=${encodeURIComponent(`/b/${business.slug}/loyalty`)}`
                )}`
              )
            }
          >
            הרשם
          </Button>
        </motion.div>
      )}

      {/* Bottom: buttons — safe area so not cut on iPhone */}
      <motion.div
        className="flex-shrink-0 w-full space-y-2 sm:space-y-3 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <Button
          onClick={handleGoHome}
          className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold"
          size="lg"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          חזרה לדף הבית
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadCalendar}
          className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-semibold border-primary text-primary hover:bg-primary/10"
          size="lg"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          הוסף ליומן
        </Button>
      </motion.div>
    </div>
  );
};

export default BookingSuccess;
