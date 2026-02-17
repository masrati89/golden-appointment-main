import { useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import FloatingWhatsApp from './FloatingWhatsApp';
import { useSettings } from '@/hooks/useSettings';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useSettings();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const bgImageUrl = settings?.background_image_url;

  // Reset scroll BEFORE new page renders (useLayoutEffect runs synchronously)
  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

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
              backgroundAttachment: 'fixed',
            }
          : {
              background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(0 0% 100%) 100%)',
            }
      }
    >
      {/* Overlay for readability when background image is set */}
      {bgImageUrl && (
        <div className="fixed inset-0 bg-black/30 z-0" />
      )}

      {/* Fixed header */}
      <Header />

      {/* Scrollable content area - persistent height, scroll reset before render */}
      <main 
        ref={mainRef}
        id="main-scroll" 
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative z-10 pt-14 pb-24 md:pb-6 px-3 sm:px-4 md:px-6 min-h-0"
      >
        {/* Content wrapper with min-height to prevent collapse during transition */}
        <div className="max-w-4xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Fixed bottom nav */}
      <BottomNav />

      {/* Floating WhatsApp button - appears on all pages */}
      <FloatingWhatsApp />
    </div>
  );
};

export default Layout;
