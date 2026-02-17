import { Home, UserCog, User, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useClientAuth } from '@/contexts/ClientAuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { isAuthenticated, user } = useClientAuth();
  const logoUrl = settings?.business_logo_url;

  return (
    <header className="fixed top-0 w-full z-50 h-12 glass-card rounded-none shadow-sm px-3">
      <div className="w-full max-w-7xl mx-auto h-full grid grid-cols-3 items-center">
        {/* Left side - Admin button */}
        <div className="flex justify-start">
          <button
            onClick={() => navigate('/admin/login')}
            className="flex items-center gap-2 min-w-[40px] min-h-[40px] justify-center rounded-lg text-muted-foreground/50 hover:text-primary transition-colors"
            aria-label="ניהול"
          >
            <UserCog className="w-4 h-4" />
          </button>
        </div>

        {/* Center - Logo/Brand name (perfectly centered) */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={settings?.business_name || 'לוגו'} className="h-8 max-w-[140px] md:max-w-[180px] object-contain" />
            ) : (
              <span className="text-lg font-bold text-foreground tracking-tight max-w-md md:max-w-lg text-center">
                {settings?.business_name || 'מכון היופי שלך'}
              </span>
            )}
          </button>
        </div>

        {/* Right side - Login/Account and Home buttons */}
        <div className="flex items-center gap-2 justify-end">
          {/* Login/Account Button */}
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 min-w-[40px] min-h-[40px] justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors px-2"
              aria-label="החשבון שלי"
              title={user?.email || 'החשבון שלי'}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">החשבון שלי</span>
            </button>
          ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 min-w-[40px] min-h-[40px] justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors px-2"
            aria-label="התחברות"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">התחברות</span>
          </button>
          )}

          {/* Home Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 min-w-[40px] min-h-[40px] justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors"
            aria-label="דף הבית"
          >
              <Home className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
