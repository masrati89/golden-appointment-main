/**
 * CustomerRegister — /register/customer
 * ──────────────────────────────────────
 * One-time profile setup for registered customers.
 * Required to link a name + phone to the Supabase auth user (client_id),
 * which enables the loyalty points system.
 *
 * Flow:
 *   1. Guest books → BookingSuccess shows "Earn loyalty points" CTA
 *   2. CTA links to /auth/login?next=/register/customer?next=/b/slug/loyalty
 *   3. Magic-link auth → AuthCallback → lands here
 *   4. Customer fills name (+ optional phone) → upserts customer_profiles
 *   5. Redirects to the original destination (e.g. /b/slug/loyalty)
 *
 * Protected by ClientProtectedRoute — requires authenticated session.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Israeli mobile phone validation
function isValidIsraeliPhone(phone: string): boolean {
  return /^05\d{8}$/.test(phone.replace(/\D/g, ''));
}

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next') || '/dashboard';

  const { user } = useClientAuth();

  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Check if profile already exists ──────────────────────────────────────
  const { data: existingProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['customer-profile-setup', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('customer_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
  });

  // Pre-fill if profile already exists
  useEffect(() => {
    if (existingProfile) {
      setForm({
        full_name: existingProfile.full_name ?? '',
        phone:     existingProfile.phone ?? '',
      });
    }
  }, [existingProfile]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setPhoneError('');

    if (!form.full_name.trim()) {
      toast.error('יש להזין שם מלא');
      return;
    }

    if (form.phone && !isValidIsraeliPhone(form.phone)) {
      setPhoneError('מספר טלפון לא תקין — הזן מספר ישראלי (לדוגמה: 050-1234567)');
      return;
    }

    if (!user?.id) {
      toast.error('שגיאה: משתמש לא מחובר');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_profiles')
        .upsert(
          {
            id:         user.id,
            full_name:  form.full_name.trim(),
            phone:      form.phone.replace(/\D/g, '') || null,
            email:      user.email ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      toast.success('הפרופיל נשמר בהצלחה!');
      navigate(nextParam, { replace: true });
    } catch (err: any) {
      console.error('[CustomerRegister] Save error:', err);
      toast.error(`שגיאה בשמירת הפרופיל: ${err?.message ?? 'שגיאה לא ידועה'}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
    >
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {existingProfile ? 'עדכן פרופיל' : 'הצטרף לתוכנית הנאמנות'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {existingProfile
              ? 'עדכן את פרטיך האישיים'
              : 'מלא את הפרטים שלך כדי להתחיל לצבור נקודות על כל תור'}
          </p>
          {user?.email && (
            <p className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full inline-block">
              {user.email}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              שם מלא <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="הכנס שם מלא"
              className="h-12 rounded-xl text-base"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">
              מספר טלפון
              <span className="text-muted-foreground font-normal mr-1">(אופציונלי)</span>
            </Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => {
                setForm((f) => ({ ...f, phone: e.target.value }));
                setPhoneError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="050-1234567"
              className="h-12 rounded-xl text-base"
              dir="ltr"
              autoComplete="tel"
            />
            {phoneError && (
              <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {phoneError}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              יסייע לנו לזהות אותך אם הזמנת בעבר ללא חשבון
            </p>
          </div>
        </div>

        {/* Save button */}
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSave}
          disabled={saving || !form.full_name.trim()}
        >
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> שומר...</>
            : <><Save className="w-5 h-5" /> שמור והמשך</>}
        </Button>

        {/* Skip link */}
        <button
          onClick={() => navigate(nextParam, { replace: true })}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          דלג על שלב זה
        </button>
      </motion.div>
    </div>
  );
}
