import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';

const TRANSITION_DELAY_MS = 400; // Show loader only if transition takes > 400ms
const MIN_DISPLAY_TIME = 300; // Minimum time to show loader (prevents flash)

/**
 * Route Transition Loader - Shows dimmed splash screen during route transitions
 * that take longer than 400ms
 */
export function RouteTransitionLoader() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset state on route change
    setIsLoading(true);
    setShowLoader(false);
    startTimeRef.current = Date.now();

    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Show loader after delay if still loading
    timeoutRef.current = setTimeout(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= TRANSITION_DELAY_MS) {
        setShowLoader(true);
      }
    }, TRANSITION_DELAY_MS);

    // Hide loader after route has rendered
    // Use a small delay to ensure smooth transition
    hideTimeoutRef.current = setTimeout(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Ensure minimum display time for smooth UX
      if (elapsed >= MIN_DISPLAY_TIME) {
        setIsLoading(false);
        setShowLoader(false);
      } else {
        // Wait for minimum display time
        setTimeout(() => {
          setIsLoading(false);
          setShowLoader(false);
        }, MIN_DISPLAY_TIME - elapsed);
      }
    }, TRANSITION_DELAY_MS + 100);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setIsLoading(false);
      setShowLoader(false);
    };
  }, [location.pathname]);

  // Don't show if loading completes quickly
  if (!showLoader || !isLoading) return null;

  return (
    <LoadingScreen 
      isDimmed={true} 
      showTimeoutFallback={false}
    />
  );
}
