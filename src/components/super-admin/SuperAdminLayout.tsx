/**
 * SuperAdminLayout + SuperAdminRoute
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Building2, Bell, LogOut, Shield } from 'lucide-react';
import { useSubscriptionAlerts } from '@/hooks/useSuperAdmin';

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('denied'); return; }
      const { data } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setStatus(data ? 'ok' : 'denied');
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }
  if (status === 'denied') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

const navItems = [
  { icon: LayoutDashboard, label: 'דשבורד', path: '/super-admin/dashboard' },
  { icon: Building2, label: 'עסקים', path: '/super-admin/businesses' },
];

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { data: alerts } = useSubscriptionAlerts();
  const alertCount = alerts?.length ?? 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(180deg, #F0F4FF 0%, #FFFFFF 100%)' }}>
      <header className="fixed top-0 left-0 right-0 h-14 z-50 border-b border-border bg-background/90 backdrop-blur-md flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Super Admin</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`
              }>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <button onClick={() => navigate('/super-admin/dashboard')} className="relative p-2 rounded-lg hover:bg-secondary">
              <Bell className="w-5 h-5 text-destructive" />
              <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">{alertCount > 9 ? '9+' : alertCount}</span>
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            יציאה
          </button>
        </div>
      </header>
      <main className="pt-14 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
