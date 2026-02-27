import { useState, useRef, useLayoutEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useSettings } from '@/hooks/useSettings';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Settings,
  BarChart3,
  LogOut,
  Ban,
  Heart,
  CreditCard,
  MoreHorizontal,
  Home,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'לוח בקרה', path: '/admin/dashboard' },
  { icon: Calendar,        label: 'תורים',    path: '/admin/bookings' },
  { icon: Sparkles,        label: 'שירותים',  path: '/admin/services' },
  { icon: Ban,             label: 'חסימות',   path: '/admin/blocked' },
  { icon: Settings,        label: 'הגדרות',   path: '/admin/settings' },
  { icon: BarChart3,       label: 'דוחות',    path: '/admin/analytics' },
  { icon: Heart,           label: 'נאמנות',   path: '/admin/loyalty' },
  { icon: CreditCard,      label: 'תשלומים',  path: '/admin/payments' },
];

// Bottom nav shows first 4 items + "more" toggle for the rest
const bottomNavItems = navItems.slice(0, 4);
const moreNavItems = navItems.slice(4);

export default function AdminLayout() {
  const { logout, businessSlug, businessId } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { data: settings } = useSettings(businessId);

  // businessSlug is loaded atomically at login via AdminAuthContext — no timing gap.
  const homePath = businessSlug ? `/b/${businessSlug}` : '/';
  const [moreOpen, setMoreOpen] = useState(false);

  // Reset scroll BEFORE new page renders (useLayoutEffect runs synchronously)
  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
    >
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-card rounded-none border-b border-border z-50 flex items-center justify-between px-4">
        <button onClick={handleLogout} className="p-2 hover:bg-secondary rounded-lg text-destructive min-w-[48px] min-h-[48px] flex items-center justify-center">
          <LogOut className="w-5 h-5" />
        </button>
        <button onClick={() => navigate(homePath)} className="font-bold text-lg text-foreground hover:text-primary transition-colors">
          {settings?.business_name || 'מכון היופי שלך'}
        </button>
        <button onClick={() => navigate(homePath)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary min-w-[48px] min-h-[48px] flex items-center justify-center transition-colors">
          <Home className="w-5 h-5" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 right-0 h-full w-64 glass-card rounded-none border-l border-border z-40">
        <div className="h-14 border-b border-border flex items-center justify-between px-6">
          <button onClick={() => navigate(homePath)} className="font-bold text-xl text-foreground hover:text-primary transition-colors">
            {settings?.business_name || 'מכון היופי שלך'}
          </button>
          <button onClick={() => navigate(homePath)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm min-h-[48px] ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-secondary text-foreground'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-sm min-h-[48px]"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">התנתק</span>
          </button>
        </div>
      </aside>

      {/* Main Content — instant navigation, no animations, scroll reset on route change */}
      <main
        ref={mainRef}
        className="lg:mr-64 pt-14 lg:pt-0 flex-1 overflow-y-auto min-h-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="p-4 lg:p-8 pb-32 lg:pb-8 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 w-full z-40 glass-card rounded-none border-t border-border pb-safe">
        {/* More menu popup */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-full right-0 left-0 p-3 z-40">
              <div className="glass-card shadow-xl p-2 mx-4 space-y-1" style={{ background: 'hsl(0 0% 100% / 0.95)' }}>
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm min-h-[48px] ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary text-foreground'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  );
                })}
                <button
                  onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-sm min-h-[48px]"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">התנתק</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-around h-[72px]">
          {bottomNavItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-xl px-3 py-2 transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="w-6 h-6" />
              <span className="text-[11px] font-medium">{label}</span>
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] rounded-xl px-3 py-2 transition-colors ${
              moreOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[11px] font-medium">עוד</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
