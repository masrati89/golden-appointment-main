import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle, Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import OnboardingTour from '@/components/OnboardingTour';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { useSettings } from '@/hooks/useSettings';

const Index = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const bgImageUrl = settings?.background_image_url;

  const steps = [
    {
      icon: Sparkles,
      title: 'בחרי שירות',
      description: 'בחרי מתוך מגוון הטיפולים שלנו',
    },
    {
      icon: Clock,
      title: 'בחרי זמן',
      description: 'מצאי את השעה הנוחה עבורך',
    },
    {
      icon: CheckCircle,
      title: 'קבלי אישור',
      description: 'קבלי אישור מיידי ותזכורת',
    },
  ];

  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col relative"
      dir="rtl"
      style={
        bgImageUrl
          ? {
              backgroundImage: `url(${bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {
              background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 100%) 100%)',
            }
      }
    >
      {bgImageUrl && <div className="absolute inset-0 bg-black/30 z-0" />}

      <Header />

      {/* Safe area: status bar + header clearance; tighter vertical rhythm on mobile */}
      <main
        className="flex-1 flex flex-col min-h-0 w-full px-4 md:px-8 overflow-y-auto z-10 relative"
        style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 3.5rem), 3.5rem)', paddingBottom: '5.5rem' }}
      >
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex flex-col justify-start gap-y-5 sm:gap-y-6 md:gap-y-8 py-2">
          {/* Hero */}
          <motion.section
            className="text-center space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {settings?.business_logo_url ? (
              <img src={settings.business_logo_url} alt={settings?.business_name || 'לוגו'} className="h-16 md:h-20 mx-auto object-contain mb-2" />
            ) : (
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold ${bgImageUrl ? 'text-white' : 'text-foreground'}`}>
                {settings?.business_name || 'סטודיו אותנטי'}
              </h1>
            )}
            <p className={`text-sm md:text-base ${bgImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
              חווית הזמנה פרימיום לסלון היופי שלך
            </p>
          </motion.section>

          {/* 3 instruction boxes */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  data-tour={`step-${i + 1}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="w-full glass-card px-5 py-4 md:py-6 lg:py-8 text-right md:text-center flex md:flex-col items-center md:items-center gap-4 md:gap-3 min-h-[60px] cursor-default"
                >
                  <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 md:flex-none">
                    <div className="flex md:justify-center items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <h3 className="text-base md:text-lg font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* CTA — reduced gap from boxes above */}
          <motion.section
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <button
              onClick={() => navigate('/booking-menu')}
              className="h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm lg:hover:shadow-lg lg:hover:scale-105 transition-all duration-200 active:scale-[0.97]"
            >
              התחילי עכשיו
            </button>
          </motion.section>

          {/* Social below CTA with mt-8 */}
          {(settings?.show_instagram || settings?.show_facebook) && (
            <motion.section
              className="flex items-center justify-center gap-4 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              {settings.show_instagram && settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-card p-3 md:p-4 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 ${
                    bgImageUrl ? 'bg-white/20 backdrop-blur-md hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                  aria-label="עקבו אחרינו באינסטגרם"
                >
                  <Instagram className={`w-5 h-5 md:w-6 md:h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
              {settings.show_facebook && settings.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-card p-3 md:p-4 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 ${
                    bgImageUrl ? 'bg-white/20 backdrop-blur-md hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                  aria-label="עקבו אחרינו בפייסבוק"
                >
                  <Facebook className={`w-5 h-5 md:w-6 md:h-6 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
            </motion.section>
          )}
        </div>
      </main>

      <OnboardingTour />
      <BottomNav />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
