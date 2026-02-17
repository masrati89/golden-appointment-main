import { Home, Calendar, CalendarPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

const navItems = [
  { icon: Home, label: 'דף הבית', path: '/' },
  { icon: Calendar, label: 'התורים שלי', path: '/my-bookings' },
  { icon: CalendarPlus, label: 'הזמנת תורים', path: '/booking-menu' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState<string | null>(null);

  const handleNavClick = async (path: string) => {
    // Check auth for booking-menu path
    if (path === '/booking-menu') {
      setIsCheckingAuth(path);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login?next=/booking-menu');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login?next=/booking-menu');
        return;
      } finally {
        setIsCheckingAuth(null);
      }
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 w-full z-40 h-[72px] glass-card rounded-none border-t border-border md:hidden pb-safe">
      <div className="flex items-center justify-around h-full">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const isChecking = isCheckingAuth === path;
          return (
            <button
              key={path}
              onClick={() => handleNavClick(path)}
              disabled={isChecking}
              data-tour={path === '/booking-menu' ? 'booking' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-xl px-4 py-2 transition-colors disabled:opacity-50 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-6 h-6 ${isChecking ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
