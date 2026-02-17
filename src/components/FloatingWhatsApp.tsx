import { useSettings } from '@/hooks/useSettings';
import { MessageCircle } from 'lucide-react';

function formatPhone(phone: string): string {
  return phone.replace(/^0/, '972').replace(/-/g, '');
}

const FloatingWhatsApp = () => {
  const { data: settings } = useSettings();

  if (!settings?.business_phone) return null;

  // הודעה מוכנה ליצירת קשר
  const defaultMessage = encodeURIComponent(
    `שלום! אני מעוניין/ת ליצור קשר לגבי השירותים שלכם.`
  );

  const waLink = `https://wa.me/${formatPhone(settings.business_phone)}?text=${defaultMessage}`;

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="צור קשר בוואטסאפ"
      className="fixed z-50 bottom-24 right-4 md:bottom-8 md:right-8 w-[60px] h-[60px] rounded-full bg-[#25D366] hover:bg-[#1da851] shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 animate-wa-pulse group"
      title="צור קשר בוואטסאפ"
    >
      <MessageCircle className="w-7 h-7 text-white" fill="white" />
      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        צור קשר בוואטסאפ
      </span>
    </a>
  );
};

export default FloatingWhatsApp;
