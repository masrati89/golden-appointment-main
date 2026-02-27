/**
 * BusinessPage — /b/:slug
 * -----------------------
 * דף הנחיתה של כל עסק.
 * טוען נתונים לפי ה-slug, מציג את פרטי העסק ומאפשר הזמנת תור.
 * אם ה-slug לא קיים — מציג 404 מעוצב.
 */
import { useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Heart, Instagram, Facebook, ArrowRight, ArrowDown } from 'lucide-react';

// ─── Waze icon (simplified brand SVG) ────────────────────────
function WazeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="24" cy="29" rx="17" ry="13" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2.4"/>
      {/* Eyes */}
      <circle cx="18.5" cy="26" r="2.8" fill="currentColor"/>
      <circle cx="29.5" cy="26" r="2.8" fill="currentColor"/>
      {/* Smile */}
      <path d="M18 32 Q24 37 30 32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      {/* Antenna dot */}
      <circle cx="33" cy="12" r="3.2" fill="currentColor"/>
      <path d="M33 15.2 Q33 21 28.5 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/**
 * Converts any Instagram post/reel URL to its embeddable form.
 * Strips query-params (e.g. ?igsh=…) that cause X-Frame-Options blocks,
 * then appends /embed/ so Instagram allows the iframe.
 * e.g. https://www.instagram.com/p/ABC123/?igsh=xyz → https://www.instagram.com/p/ABC123/embed/
 */
function toInstagramEmbedUrl(url: string): string {
  const clean = url.split('?')[0].replace(/\/+$/, '');
  return `${clean}/embed/`;
}

/** Smart Waze deep-link: raw address → waze.com search; existing Waze/waze:// URL → pass through */
function getWazeHref(value: string): string {
  if (
    value.startsWith('https://waze.com') ||
    value.startsWith('https://www.waze.com') ||
    value.startsWith('waze://')
  ) {
    return value;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(value)}&navigate=yes`;
}
import { motion } from 'framer-motion';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSettings } from '@/hooks/useSettings';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import BottomNav from '@/components/BottomNav';

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
  const bgImageUrl = settings?.background_image_url;

  const handleBookAppointment = () => {
    navigate(`/b/${business!.slug}/book`);
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
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 2rem), 2rem)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 6rem), 6rem)',
        }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-center items-center gap-y-3 md:gap-y-4 py-1">

          {/* Hero */}
          <motion.section
            className="text-center space-y-1 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {settings?.business_logo_url ? (
              <img
                src={settings.business_logo_url}
                alt={business?.name || 'לוגו'}
                className="h-12 md:h-16 mx-auto object-contain mb-1 max-w-md"
                loading="lazy"
              />
            ) : (
              <h1 className={`text-2xl md:text-3xl font-bold tracking-wide mx-auto max-w-md ${bgImageUrl ? 'text-white' : 'text-foreground'}`}>
                {business?.name || settings?.business_name || 'מכון היופי שלך'}
              </h1>
            )}
            <p className={`text-xs md:text-sm mx-auto max-w-md ${bgImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
              חווית הזמנה פרימיום
            </p>
          </motion.section>

          {/* Steps */}
          <section className="flex flex-col md:flex-row items-center justify-center gap-y-1 md:gap-y-0 flex-shrink-0 px-2 w-full py-1">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex flex-col md:flex-row items-center">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                    className="flex flex-col items-center text-center max-w-xs px-2"
                  >
                    <span className={`text-xs font-serif font-light mb-0.5 ${bgImageUrl ? 'text-[#D4B896]/60' : 'text-[#D4B896]/50'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-base md:text-lg font-bold ${bgImageUrl ? 'text-white' : 'text-[#2D3440]'}`}>
                        {step.title}
                      </h3>
                      <step.icon size={18} className="text-[#B8956A]" strokeWidth={1.5} />
                    </div>
                    <p className={`text-xs leading-snug ${bgImageUrl ? 'text-white/70' : 'text-[#2D3440]/60'}`}>
                      {step.description}
                    </p>
                  </motion.div>

                  {!isLast && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.15 + 0.3 }}
                      className="flex items-center justify-center my-1 md:my-0 md:mx-6"
                    >
                      <ArrowRight className="hidden md:block w-4 h-4 text-[#B8956A]" strokeWidth={2} />
                      <ArrowDown className="md:hidden w-4 h-4 text-[#B8956A]" strokeWidth={2} />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </section>

          {/* CTA */}
          <motion.div
            className="text-center flex-shrink-0 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <button
              onClick={handleBookAppointment}
              className="h-12 sm:h-14 px-10 sm:px-12 rounded-xl text-base sm:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold-md hover:shadow-gold-lg hover:scale-105 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 mx-auto"
            >
              קביעת תור
            </button>
          </motion.div>

          {/* Gallery carousel */}
          {(settings as any)?.show_gallery &&
            (((settings as any)?.custom_images?.length ?? 0) + ((settings as any)?.instagram_urls?.length ?? 0) > 0) && (
            <motion.section
              className="w-full flex-shrink-0 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <p className={`text-sm font-semibold mb-3 text-center ${bgImageUrl ? 'text-white' : 'text-foreground'}`}>
                העבודות שלנו
              </p>
              <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {((settings as any).custom_images ?? []).map((url: string, i: number) => (
                  <div
                    key={`img-${i}`}
                    className="flex-shrink-0 w-52 h-52 snap-center rounded-xl overflow-hidden border border-white/20 shadow-md"
                  >
                    <img
                      src={url}
                      alt={`עבודה ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
                {((settings as any).instagram_urls ?? [])
                  .filter((url: string) => url.includes('instagram.com/p/') || url.includes('instagram.com/reel/'))
                  .map((url: string, i: number) => (
                    <div
                      key={`ig-${i}`}
                      className="flex-shrink-0 w-52 h-52 snap-center rounded-xl overflow-hidden border border-white/20 shadow-md bg-white"
                    >
                      <iframe
                        src={toInstagramEmbedUrl(url)}
                        className="w-full h-full"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency={true}
                        loading="lazy"
                        title={`Instagram ${i + 1}`}
                      />
                    </div>
                  ))}
              </div>
            </motion.section>
          )}

          {/* Social */}
          {(settings?.show_instagram || settings?.show_facebook || (settings as any)?.show_waze) && (
            <motion.section
              className="flex items-center justify-center gap-4 flex-shrink-0 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              {/* M-2: Only render social links that start with https:// to prevent XSS via javascript: URLs */}
              {settings?.show_instagram && settings.instagram_url?.startsWith('https://') && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                  className={`glass-card p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${bgImageUrl ? 'bg-white/20 hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                  <Instagram className={`w-6 h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
              {settings?.show_facebook && settings.facebook_url?.startsWith('https://') && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                  className={`glass-card p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${bgImageUrl ? 'bg-white/20 hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                  <Facebook className={`w-6 h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
              {(settings as any)?.show_waze && (settings as any)?.waze_url && (
                <a
                  href={getWazeHref((settings as any).waze_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-card p-3 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center group ${bgImageUrl ? 'bg-white/20 hover:bg-[#33ccff]/30' : 'bg-secondary/50 hover:bg-[#33ccff]/20'}`}
                >
                  <WazeIcon className={`w-6 h-6 group-hover:text-[#33ccff] transition-colors ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
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
      <BottomNav />
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
