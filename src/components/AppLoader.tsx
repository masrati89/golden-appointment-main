import { motion } from 'framer-motion';

interface AppLoaderProps {
  /** Optional logo URL (e.g. from settings). When absent, shows app name. */
  logoUrl?: string | null;
  /** Optional business name for fallback text */
  businessName?: string | null;
}

/**
 * Premium loader: logo/name centered with gentle pulse.
 * Use only for: initial app boot (Suspense) and auth session check (isLoading).
 * Do NOT use for client-side navigation between admin pages.
 */
export function AppLoader({ logoUrl, businessName }: AppLoaderProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
      dir="rtl"
    >
      <motion.div
        className="flex flex-col items-center justify-center gap-3"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName || 'לוגו'}
            className="h-16 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <span className="text-xl font-bold text-foreground/80 tracking-tight">
            {businessName || 'מכון היופי שלך'}
          </span>
        )}
      </motion.div>
    </div>
  );
}
