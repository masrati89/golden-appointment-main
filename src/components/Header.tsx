import { Home, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';

const Header = () => {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const logoUrl = settings?.business_logo_url;

  return (
    <header className="fixed top-0 w-full z-50 h-12 glass-card rounded-none shadow-sm flex items-center justify-between px-3">
      <button
        onClick={() => navigate('/admin/login')}
        className="flex items-center gap-2 min-w-[40px] min-h-[40px] justify-center rounded-lg text-muted-foreground/50 hover:text-primary transition-colors"
        aria-label="ניהול"
      >
        <UserCog className="w-4 h-4" />
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex items-center justify-center"
      >
        {logoUrl ? (
          <img src={logoUrl} alt={settings?.business_name || 'לוגו'} className="h-8 max-w-[140px] object-contain" />
        ) : (
          <span className="text-lg font-bold text-foreground tracking-tight">
            {settings?.business_name || 'סטודיו אלגנט'}
          </span>
        )}
      </button>

      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 min-w-[40px] min-h-[40px] justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors"
        aria-label="דף הבית"
      >
        <Home className="w-5 h-5" />
      </button>
    </header>
  );
};

export default Header;
