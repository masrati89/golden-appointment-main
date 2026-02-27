import { Home, Calendar, CalendarPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBusinessSafe } from '@/contexts/BusinessContext';
import { businessHomeUrl } from '@/lib/businessSlug';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { business } = useBusinessSafe();

  // Always send the user back to the specific business page they came from.
  const homePath = business?.slug ? `/b/${business.slug}` : businessHomeUrl();
  const bookPath = business?.slug ? `/b/${business.slug}/book` : null;

  const navItems = [
    { icon: Home,        label: 'דף הבית',      path: homePath },
    { icon: Calendar,    label: 'התורים שלי',   path: '/my-bookings' },
    { icon: CalendarPlus, label: 'הזמנת תורים', path: bookPath ?? homePath },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 h-[72px] glass-card rounded-none border-t border-border md:hidden pb-safe">
      <div className="flex items-center justify-around h-full">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              data-tour={label === 'הזמנת תורים' ? 'booking' : undefined}
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
