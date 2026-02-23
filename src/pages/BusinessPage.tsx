/**
 * BusinessPage — /b/:slug
 * -----------------------
 * דף הנחיתה של כל עסק.
 * טוען נתונים לפי ה-slug, מציג את פרטי העסק ומאפשר הזמנת תור.
 * אם ה-slug לא קיים — מציג 404 מעוצב.
 */
import { useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Heart, Instagram, Facebook, ArrowRight, ArrowDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSettings } from '@/hooks/useSettings';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

// ─── 404 מעוצב ───────────────────────────────────────────────
function BusinessNotFound() {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center gap-6 px-4 text-center" dir="rtl">
      <div className="text-6xl">🏪</div>
      <h1 className="text-2xl font-bold text-foreground">העסק לא נמצא</h1>
      <p className="text-muted-foreground max-w-sm">
        הכתובת שהזנת אינה קיימת במערכת. ייתכן שהעסק הפסיק לפעול או שהקישור שגוי.
      </p>
    </div>
  );
}

// ─── Skeleton בזמן טעינה ──────────────────────────────────────
function BusinessPageSkeleton() {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center gap-8 px-4" dir="rtl">
      <div className="w-40 h-8 bg-muted animate-pulse rounded-xl" />
      <div className="w-56 h-4 bg-muted animate-pulse rounded-xl" />
      <div className="flex gap-6 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-24 h-20 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="w-48 h-12 bg-muted animate-pulse rounded-xl mt-4" />
    </div>
  );
}

// ─── תוכן הדף ────────────────────────────────────────────────
function BusinessPageContent() {
  const navigate = useNavigate();
  const { business, businessId } = useBusiness();
  const { data: settings } = useSettings(businessId);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const bgImageUrl = settings?.background_image_url;

  const handleBookAppointment = async () => {
    setIsCheckingAuth(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const bookingPath = `/b/${business!.slug}/book`;
      if (!session) {
        navigate(`/login?next=${encodeURIComponent(bookingPath)}`);
      } else {
        navigate(bookingPath);
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const steps = [
    { icon: Sparkles, title: 'בחרי שירות',   description: 'בחרי מתוך מגוון הטיפולים שלנו' },
    { icon: Calendar, title: 'בחרי זמן',     description: 'מצאי את השעה הנוחה עבורך' },
    { icon: Heart,    title: 'קבלי אישור',   description: 'קבלי אישור מיידי ותזכורת' },
  ];

  return (
    <div
      className="min-h-[100svh] flex flex-col relative overflow-x-hidden"
      dir="rtl"
      style={
        bgImageUrl
          ? { backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 100%) 100%)' }
      }
    >
      {bgImageUrl && <div className="absolute inset-0 bg-black/30 z-0" />}

      <main
        className="flex-1 flex flex-col justify-center w-full px-4 sm:px-6 md:px-8 overflow-y-auto z-10 relative"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 3.5rem), 3.5rem)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 4rem), 4rem)',
        }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-center items-center gap-y-6 md:gap-y-8 py-4">

          {/* Hero */}
          <motion.section
            className="text-center space-y-2 flex-shrink-0 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {settings?.business_logo_url ? (
              <img
                src={settings.business_logo_url}
                alt={business?.name || 'לוגו'}
                className="h-16 md:h-20 mx-auto object-contain mb-2 max-w-md"
                loading="lazy"
              />
            ) : (
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide mx-auto max-w-md ${bgImageUrl ? 'text-white' : 'text-foreground'}`}>
                {business?.name || settings?.business_name || 'מכון היופי שלך'}
              </h1>
            )}
            <p className={`text-sm md:text-base mx-auto max-w-md ${bgImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
              חווית הזמנה פרימיום
            </p>
          </motion.section>

          {/* Steps */}
          <section className="flex flex-col md:flex-row items-center justify-center gap-y-4 md:gap-y-0 flex-shrink-0 px-2 w-full py-4">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex flex-col md:flex-row items-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center max-w-xs px-3"
                  >
                    <span className={`text-xs font-serif font-light mb-1 ${bgImageUrl ? 'text-[#D4B896]/60' : 'text-[#D4B896]/50'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-lg md:text-xl font-bold ${bgImageUrl ? 'text-white' : 'text-[#2D3440]'}`}>
                        {step.title}
                      </h3>
                      <step.icon size={22} className="text-[#B8956A]" strokeWidth={1.5} />
                    </div>
                    <p className={`text-sm leading-relaxed ${bgImageUrl ? 'text-white/70' : 'text-[#2D3440]/60'}`}>
                      {step.description}
                    </p>
                  </motion.div>

                  {!isLast && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.15 + 0.3 }}
                      className="flex items-center justify-center my-4 md:my-0 md:mx-6"
                    >
                      <ArrowRight className="hidden md:block w-5 h-5 text-[#B8956A]" strokeWidth={2} />
                      <ArrowDown className="md:hidden w-5 h-5 text-[#B8956A]" strokeWidth={2} />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </section>

          {/* CTA */}
          <motion.div
            className="text-center flex-shrink-0 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <button
              onClick={handleBookAppointment}
              disabled={isCheckingAuth}
              className="h-12 sm:h-14 px-10 sm:px-12 rounded-xl text-base sm:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold-md hover:shadow-gold-lg hover:scale-105 transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isCheckingAuth ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>בודק...</span></>
              ) : 'קביעת תור'}
            </button>
          </motion.div>

          {/* Social */}
          {(settings?.show_instagram || settings?.show_facebook) && (
            <motion.section
              className="flex items-center justify-center gap-4 flex-shrink-0 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              {/* M-2: Only render social links that start with https:// to prevent XSS via javascript: URLs */}
              {settings.show_instagram && settings.instagram_url?.startsWith('https://') && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                  className={`glass-card p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${bgImageUrl ? 'bg-white/20 hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                  <Instagram className={`w-6 h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
              {settings.show_facebook && settings.facebook_url?.startsWith('https://') && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                  className={`glass-card p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${bgImageUrl ? 'bg-white/20 hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                  <Facebook className={`w-6 h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
            </motion.section>
          )}
        </div>
      </main>

      {/* Admin shortcut — bottom left corner */}
      <a
        href="/admin/dashboard"
        className="fixed top-4 left-4 z-50 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors px-2 py-1 rounded-lg hover:bg-black/5"
      >
        ניהול
      </a>
      <FloatingWhatsApp />
    </div>
  );
}

// ─── ייצוא ראשי ──────────────────────────────────────────────
export default function BusinessPage() {
  const { isLoading, notFound } = useBusiness();

  if (isLoading) return <BusinessPageSkeleton />;
  if (notFound)  return <BusinessNotFound />;
  return <BusinessPageContent />;
}
