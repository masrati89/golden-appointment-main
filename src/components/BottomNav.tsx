import { Home, Calendar, CalendarPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { icon: Home, label: 'דף הבית', path: '/' },
  { icon: Calendar, label: 'התורים שלי', path: '/my-bookings' },
  { icon: CalendarPlus, label: 'הזמנת תורים', path: '/booking-menu' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 w-full z-40 h-[72px] glass-card rounded-none border-t border-border md:hidden pb-safe">
      <div className="flex items-center justify-around h-full">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-tour={path === '/booking-menu' ? 'booking' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-xl px-4 py-2 transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
