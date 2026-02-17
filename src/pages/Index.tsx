import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle, Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import OnboardingTour from '@/components/OnboardingTour';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const bgImageUrl = settings?.background_image_url;
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const handleBookAppointment = async () => {
    setIsCheckingAuth(true);
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - redirect to login with next param
        navigate('/login?next=/booking-menu');
      } else {
        // Logged in - proceed to booking
        navigate('/booking-menu');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // On error, still allow navigation but redirect to login
      navigate('/login?next=/booking-menu');
    } finally {
      setIsCheckingAuth(false);
    }
  };

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
      className="min-h-[100svh] flex flex-col relative overflow-x-hidden"
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

      {/* Main content area with perfect vertical centering */}
      <main
        className="flex-1 flex flex-col justify-center min-h-0 w-full px-4 sm:px-6 md:px-8 lg:px-12 overflow-y-auto z-10 relative"
        style={{ 
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 3.5rem), 3.5rem)', 
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 6rem), 6rem)' 
        }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-center min-h-full gap-y-8">
          {/* Hero Section - Perfectly centered */}
          <motion.section
            className="text-center space-y-2 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {settings?.business_logo_url ? (
              <img 
                src={settings.business_logo_url} 
                alt={settings?.business_name || 'לוגו'} 
                className="h-16 md:h-20 lg:h-24 mx-auto object-contain mb-2 max-w-md md:max-w-lg" 
              />
            ) : (
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide mx-auto max-w-md md:max-w-lg ${bgImageUrl ? 'text-white' : 'text-foreground'}`}>
                {settings?.business_name || 'מכון היופי שלך'}
              </h1>
            )}
            <p className={`text-sm md:text-base lg:text-lg mx-auto max-w-md md:max-w-lg ${bgImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
              חווית הזמנה פרימיום לסלון היופי שלך
            </p>
          </motion.section>

          {/* 3 instruction boxes - Below hero with equal spacing */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 flex-shrink-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  data-tour={`step-${i + 1}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                  className="w-full glass-card px-4 sm:px-5 md:px-6 py-6 sm:py-7 md:py-8 text-right md:text-center flex md:flex-col items-center md:items-center gap-4 md:gap-3 cursor-default overflow-hidden"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 md:flex-none w-full">
                    <div className="flex md:justify-center items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <h3 className={`text-lg md:text-xl font-bold text-foreground line-clamp-2 ${bgImageUrl ? 'text-white' : ''}`}>
                        {step.title}
                      </h3>
                    </div>
                    <p className={`text-sm md:text-base text-muted-foreground line-clamp-2 ${bgImageUrl ? 'text-white/80' : ''}`}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* CTA Button - Below instruction boxes with equal spacing */}
          <motion.section
            className="text-center flex-shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <button
              onClick={handleBookAppointment}
              disabled={isCheckingAuth}
              className="h-12 sm:h-14 md:h-16 px-8 sm:px-10 md:px-12 lg:px-16 rounded-xl text-base sm:text-lg md:text-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md md:shadow-lg lg:hover:shadow-xl lg:hover:scale-105 transition-all duration-200 active:scale-[0.97] min-w-[200px] sm:min-w-[240px] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isCheckingAuth ? (
                <>
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  <span>בודק...</span>
                </>
              ) : (
                'התחילי עכשיו'
              )}
            </button>
          </motion.section>

          {/* Social below CTA with proper spacing */}
          {(settings?.show_instagram || settings?.show_facebook) && (
            <motion.section
              className="flex items-center justify-center gap-4 sm:gap-5 flex-shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              {settings.show_instagram && settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-card p-3 sm:p-4 md:p-5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center ${
                    bgImageUrl ? 'bg-white/20 backdrop-blur-md hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                  aria-label="עקבו אחרינו באינסטגרם"
                >
                  <Instagram className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
                </a>
              )}
              {settings.show_facebook && settings.facebook_url && (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-card p-3 sm:p-4 md:p-5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center ${
                    bgImageUrl ? 'bg-white/20 backdrop-blur-md hover:bg-white/30' : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                  aria-label="עקבו אחרינו בפייסבוק"
                >
                  <Facebook className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${bgImageUrl ? 'text-white' : 'text-foreground'}`} />
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
