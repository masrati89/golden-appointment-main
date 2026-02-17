import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

const SPLASH_STORAGE_KEY = 'studio_authenti_splash_shown';
const SPLASH_DURATION = 2000; // 2 seconds
const TIMEOUT_DURATION = 5000; // 5 seconds fallback

interface LoadingScreenProps {
  /** If true, shows dimmed version (70% opacity) for route transitions */
  isDimmed?: boolean;
  /** If true, shows timeout fallback button */
  showTimeoutFallback?: boolean;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
}

export function LoadingScreen({ isDimmed = false, showTimeoutFallback = false, onTimeout }: LoadingScreenProps) {
  // Use settings hook - must be inside QueryClientProvider
  const { data: settings } = useSettings();
  const [shouldShow, setShouldShow] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const logoUrl = settings?.business_logo_url;
  const businessName = settings?.business_name || 'מכון היופי שלך';

  useEffect(() => {
    // Check if splash was already shown this session
    try {
      const splashShown = sessionStorage.getItem(SPLASH_STORAGE_KEY);
      
      if (!isDimmed && splashShown === 'true') {
        // Full splash already shown - don't show again
        setShouldShow(false);
        return;
      }

      // Show the splash screen
      setShouldShow(true);

      // Mark as shown in sessionStorage (only for full splash)
      if (!isDimmed) {
        try {
          sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
        } catch (e) {
          console.warn('[LoadingScreen] Failed to set sessionStorage:', e);
        }
      }

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalTop = document.body.style.top;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';

      // Timeout fallback
      const timeoutId = setTimeout(() => {
        if (showTimeoutFallback) {
          setHasTimedOut(true);
          onTimeout?.();
        }
      }, TIMEOUT_DURATION);

      // Auto-hide after duration (only for full splash)
      if (!isDimmed) {
        const hideTimer = setTimeout(() => {
          setShouldShow(false);
        }, SPLASH_DURATION);

        return () => {
          clearTimeout(hideTimer);
          clearTimeout(timeoutId);
          // Restore body scroll
          document.body.style.overflow = originalOverflow;
          document.body.style.position = originalPosition;
          document.body.style.width = originalWidth;
          document.body.style.top = originalTop;
        };
      }

      return () => {
        clearTimeout(timeoutId);
        // Restore body scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.top = originalTop;
      };
    } catch (error) {
      console.error('[LoadingScreen] Error in useEffect:', error);
      setShouldShow(false);
    }
  }, [isDimmed, showTimeoutFallback, onTimeout]);

  // Don't render if shouldn't show
  if (!shouldShow && !hasTimedOut) return null;

  return (
    <AnimatePresence>
      {(shouldShow || hasTimedOut) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isDimmed ? 0.7 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: isDimmed ? 'rgba(247, 245, 242, 0.7)' : '#F7F5F2',
            backdropFilter: isDimmed ? 'blur(4px)' : 'none',
          }}
          dir="rtl"
        >
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Logo Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: hasTimedOut ? 0.5 : 1,
                scale: hasTimedOut ? 1 : [0.9, 1.1, 1],
              }}
              transition={{
                opacity: { duration: 0.3 },
                scale: {
                  duration: 1.5,
                  repeat: isDimmed ? Infinity : 0,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                },
              }}
              className="flex items-center justify-center"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className={`${isDimmed ? 'h-16' : 'h-24 md:h-32'} w-auto max-w-[200px] object-contain`}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`${isDimmed ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32'} rounded-full bg-[#D4B896]/20 flex items-center justify-center`}>
                    <Sparkles className={`${isDimmed ? 'w-8 h-8' : 'w-12 h-12 md:w-16 md:h-16'} text-[#D4B896]`} />
                  </div>
                  {!isDimmed && (
                    <span className="text-xl md:text-2xl font-bold text-[#2D3440] tracking-tight">
                      {businessName}
                    </span>
                  )}
                </div>
              )}
            </motion.div>

            {/* Timeout Fallback */}
            {hasTimedOut && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 mt-8"
              >
                <p className="text-sm text-[#2D3440]/70">
                  טוען זמן רב מהצפוי...
                </p>
                <button
                  onClick={() => {
                    setShouldShow(false);
                    setHasTimedOut(false);
                    window.location.href = '/';
                  }}
                  className="h-11 px-6 rounded-xl text-sm font-semibold bg-[#D4B896] hover:bg-[#D4B896]/90 text-white shadow-md hover:shadow-lg transition-all"
                >
                  המשך לדף הבית
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
