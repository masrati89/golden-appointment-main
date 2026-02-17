import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'hasSeenTour';

interface TourStep {
  targetSelector: string;
  message: string;
}

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="step-1"]', message: 'בחרי את הטיפול שמתאים לך 💆' },
  { targetSelector: '[data-tour="step-2"]', message: 'בחרי תאריך ושעה שנוחים לך 📅' },
  { targetSelector: '[data-tour="step-3"]', message: 'קבלי אישור מיידי ותזכורת ✅' },
  { targetSelector: '[data-tour="admin"]', message: 'כניסה לניהול העסק (למנהלים בלבד) 🔒' },
];

const OnboardingTour = () => {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number; placement: 'above' | 'below' }>({ top: 0, left: 0, placement: 'below' });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateRect = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Calculate safe bubble position after targetRect and bubble are rendered
  useEffect(() => {
    if (!targetRect || !bubbleRef.current) return;

    const bubble = bubbleRef.current;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const gap = 14;
    const pad = 12; // viewport padding

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: center on target, clamp to viewport
    let left = targetRect.left + targetRect.width / 2 - bw / 2;
    left = Math.max(pad, Math.min(left, vw - bw - pad));

    // Vertical: prefer below, fallback above
    let top = targetRect.bottom + gap;
    let placement: 'above' | 'below' = 'below';

    if (top + bh > vh - pad) {
      // Not enough space below — try above
      top = targetRect.top - gap - bh;
      placement = 'above';
      if (top < pad) {
        // Not enough space above either — center vertically
        top = Math.max(pad, (vh - bh) / 2);
      }
    }

    setBubblePos({ top, left, placement });
  }, [targetRect, currentStep]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, currentStep, updateRect]);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setActive(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, finish]);

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]" dir="rtl">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={finish}
        />

        {/* Spotlight cutout + pulse glow */}
        {targetRect && (
          <>
            {/* Main spotlight */}
            <div
              className="absolute rounded-xl z-[101]"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                background: 'transparent',
              }}
            />
            {/* Pulsing glow ring */}
            <div
              className="absolute rounded-xl z-[101] pointer-events-none animate-tour-pulse"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
              }}
            />
          </>
        )}

        {/* Bubble — rendered off-screen first for measurement, then positioned */}
        <motion.div
          ref={bubbleRef}
          key={currentStep}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed z-[102] bg-card border border-border rounded-2xl shadow-2xl p-5 w-[calc(100vw-24px)] max-w-[300px]"
          style={{
            top: bubblePos.top,
            left: bubblePos.left,
          }}
        >
          <p className="font-medium text-foreground mb-4 text-base leading-relaxed">
            {step.message}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[36px] px-2"
            >
              דלג
            </button>
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors min-h-[36px] px-2"
            >
              {isLast ? 'סיום ✨' : 'הבא →'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
