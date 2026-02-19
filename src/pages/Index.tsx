import { useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Heart, Instagram, Facebook, ArrowRight, ArrowDown } from 'lucide-react';
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
      icon: Calendar,
      title: 'בחרי זמן',
      description: 'מצאי את השעה הנוחה עבורך',
    },
    {
      icon: Heart,
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
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 7rem), 7rem)' 
        }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col justify-center items-center min-h-full gap-y-6 md:gap-y-8 py-4">
          {/* Hero Section - Perfectly centered with balanced bottom margin */}
          <motion.section
            className="text-center space-y-2 flex-shrink-0 mb-8 md:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {settings?.business_logo_url ? (
              <img
                src={settings.business_logo_url}
                alt={settings?.business_name || 'לוגו'}
                className="h-16 md:h-20 lg:h-24 mx-auto object-contain mb-2 max-w-md md:max-w-lg"
                loading="lazy"
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

          {/* Process Guide - Luxury Compact with balanced vertical padding */}
          <section className="flex flex-col md:flex-row items-center justify-center gap-y-4 md:gap-y-0 flex-shrink-0 px-2 md:px-4 w-full py-6 md:py-8">
            {steps.map((step, i) => {
              const stepNumber = String(i + 1).padStart(2, '0');
              const isLast = i === steps.length - 1;
              
              return (
                <div key={i} className="flex flex-col md:flex-row items-center">
                  {/* Step Content */}
                  <motion.div
                    data-tour={`step-${i + 1}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: i * 0.15,
                      ease: 'easeOut'
                    }}
                    className="flex flex-col items-center text-center max-w-xs px-2 md:px-3"
                  >
                    {/* Step Content with Icon and Number */}
                    <div className="flex flex-col items-center w-full">
                      {/* Number - Subtle guide above */}
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: i * 0.15 + 0.1,
                          ease: 'easeOut'
                        }}
                        className={`text-xs font-serif font-light mb-1 ${bgImageUrl ? 'text-[#D4B896]/60' : 'text-[#D4B896]/50'}`}
                        style={{ 
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          letterSpacing: '0.1em'
                        }}
                      >
                        {stepNumber}
                      </motion.span>
                      
                      {/* Title with Icon - Icon on the right (RTL) */}
                      <div className="flex items-center gap-2 mb-3">
                        <h3 
                          className={`text-lg md:text-xl lg:text-2xl font-bold leading-tight ${bgImageUrl ? 'text-white' : 'text-[#2D3440]'}`}
                        >
                          {step.title}
                        </h3>
                        {/* Elegant Icon with Gold Shadow */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ 
                            duration: 0.4, 
                            delay: i * 0.15 + 0.2,
                            ease: 'easeOut'
                          }}
                          className="shadow-gold-sm"
                        >
                          <step.icon 
                            size={24} 
                            className="text-[#B8956A]"
                            strokeWidth={1.5}
                          />
                        </motion.div>
                      </div>
                      
                      {/* Step Description */}
                      <p 
                        className={`text-sm md:text-base leading-relaxed ${bgImageUrl ? 'text-white/70' : 'text-[#2D3440]/60'}`}
                        style={{ lineHeight: '1.6' }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </motion.div>

                  {/* Enhanced Arrow Between Steps */}
                  {!isLast && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.5, 
                        delay: i * 0.15 + 0.3,
                        ease: 'easeOut'
                      }}
                      className="flex items-center justify-center my-5 md:my-0 md:mx-4 lg:mx-8 relative z-10"
                    >
                      {/* Desktop: Horizontal Arrow */}
                      <motion.div
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: i * 0.15 + 0.4,
                          ease: 'easeOut'
                        }}
                      >
                        <ArrowRight 
                          className="hidden md:block w-5 h-5 lg:w-6 lg:h-6 text-[#B8956A]"
                          strokeWidth={2}
                        />
                      </motion.div>
                      {/* Mobile: Vertical Arrow */}
                      <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: i * 0.15 + 0.4,
                          ease: 'easeOut'
                        }}
                      >
                        <ArrowDown 
                          className="md:hidden w-5 h-5 text-[#B8956A]"
                          strokeWidth={2}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </section>

          {/* CTA Button - Clear destination with balanced top margin */}
          <div className="text-center flex-shrink-0 mt-6 md:mt-8 relative z-10">
            <motion.button
              onClick={handleBookAppointment}
              disabled={isCheckingAuth}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="h-12 sm:h-14 md:h-16 px-8 sm:px-10 md:px-12 lg:px-16 rounded-xl text-base sm:text-lg md:text-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold-md md:shadow-gold-lg lg:hover:shadow-gold-xl lg:hover:scale-105 transition-all duration-200 active:scale-[0.97] min-w-[200px] sm:min-w-[240px] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isCheckingAuth ? (
                <>
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  <span>בודק...</span>
                </>
              ) : (
                'התחילי עכשיו'
              )}
            </motion.button>
          </div>

          {/* Social below CTA with balanced spacing */}
          {(settings?.show_instagram || settings?.show_facebook) && (
            <motion.section
              className="flex items-center justify-center gap-4 sm:gap-5 flex-shrink-0 mt-4 md:mt-6 mb-4"
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
