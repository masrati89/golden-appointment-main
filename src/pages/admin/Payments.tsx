import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, ShieldCheck, Banknote, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Gateway = 'morning' | 'meshulam' | '';
type PaymentType = 'full' | 'deposit';

/* ─── sub-components ──────────────────────────────────────────── */

function Card({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 rounded-2xl space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-base font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-[44px]">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TokenField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-xl border-2 pl-12"
          dir="ltr"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          {visible ? 'הסתר' : 'הצג'}
        </button>
      </div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────── */

export default function AdminPayments() {
  const { businessId } = useAdminAuth();
  const { data: settings, isLoading } = useSettings(businessId);
  const queryClient = useQueryClient();

  // ── Online gateway state ───────────────────────────────────────
  const [isPaymentRequired, setIsPaymentRequired] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<Gateway>('');
  const [morningApiKey, setMorningApiKey] = useState('');
  const [morningApiSecret, setMorningApiSecret] = useState('');
  const [meshulamPageCode, setMeshulamPageCode] = useState('');
  const [meshulamApiToken, setMeshulamApiToken] = useState('');

  // ── Payment rules state ────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [depositAmount, setDepositAmount] = useState('');

  // ── Offline state ──────────────────────────────────────────────
  const [cashEnabled, setCashEnabled] = useState(true);

  // Populate form from DB on first load
  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setIsPaymentRequired(s.is_payment_required ?? false);
    setPaymentGateway(s.payment_gateway ?? '');
    setMorningApiKey(s.morning_api_key ?? '');
    setMorningApiSecret(s.morning_api_secret ?? '');
    setMeshulamPageCode(s.meshulam_page_code ?? '');
    setMeshulamApiToken(s.meshulam_api_token ?? '');
    setPaymentType(s.payment_type ?? 'full');
    setDepositAmount(s.deposit_amount != null ? String(s.deposit_amount) : '');
    setCashEnabled(s.payment_cash_enabled ?? true);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('שגיאה: מזהה עסק חסר');

      const payload: Record<string, unknown> = {
        // Offline
        payment_cash_enabled: cashEnabled,
        // Online master toggle
        is_payment_required: isPaymentRequired,
        // Gateway — null-out when online is OFF or no gateway selected
        payment_gateway: isPaymentRequired && paymentGateway ? paymentGateway : null,
        morning_api_key:
          isPaymentRequired && paymentGateway === 'morning' ? morningApiKey || null : null,
        morning_api_secret:
          isPaymentRequired && paymentGateway === 'morning' ? morningApiSecret || null : null,
        meshulam_page_code:
          isPaymentRequired && paymentGateway === 'meshulam' ? meshulamPageCode || null : null,
        meshulam_api_token:
          isPaymentRequired && paymentGateway === 'meshulam' ? meshulamApiToken || null : null,
        // Payment rules — null-out when online is OFF
        payment_type: isPaymentRequired ? paymentType : null,
        deposit_amount:
          isPaymentRequired && paymentType === 'deposit' && depositAmount !== ''
            ? Number(depositAmount)
            : null,
      };

      const { error } = await supabase
        .from('settings')
        .update(payload)
        .eq('business_id', businessId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', businessId] });
      toast.success('הגדרות התשלום נשמרו');
    },
    onError: (err: any) => {
      toast.error('שגיאה בשמירה', { description: err?.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6" dir="rtl">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">תשלומים וסליקה</h1>
          <p className="text-sm text-muted-foreground">הגדר שער תשלום מקוון ואמצעי תשלום</p>
        </div>
      </div>

      {/* ── Section 1: Online Processing ─────────────────────────── */}
      <Card icon={ShieldCheck} title="סליקה אונליין">

        {/* A. Master toggle */}
        <ToggleRow
          label="סליקת אשראי ו-Bit אונליין"
          description="הלקוח יועבר לדף תשלום מאובטח בסיום ההזמנה"
          checked={isPaymentRequired}
          onChange={setIsPaymentRequired}
        />

        {isPaymentRequired && (
          <>
            {/* B. Gateway selector */}
            <div className="space-y-3 pt-1">
              <p className="text-sm font-semibold text-foreground">בחר חברת סליקה</p>
              {([
                {
                  value: 'meshulam' as Gateway,
                  label: 'Meshulam',
                  desc: 'חיבור דרך Page Code ו-API Token',
                  emoji: '🟣',
                },
                {
                  value: 'morning' as Gateway,
                  label: 'Morning (Green Invoice)',
                  desc: 'חיבור דרך ה-API Token של Morning',
                  emoji: '🟢',
                },
              ] as { value: Gateway; label: string; desc: string; emoji: string }[]).map(
                ({ value, label, desc, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentGateway(value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right ${
                      paymentGateway === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 bg-transparent'
                    }`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    {paymentGateway === value && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                )
              )}
            </div>

            {/* C. Meshulam credentials */}
            {paymentGateway === 'meshulam' && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  פרטי חיבור Meshulam
                </p>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Page Code</Label>
                  <Input
                    value={meshulamPageCode}
                    onChange={(e) => setMeshulamPageCode(e.target.value)}
                    placeholder="קוד עמוד הסליקה"
                    className="h-11 rounded-xl border-2"
                    dir="ltr"
                    autoComplete="off"
                  />
                </div>
                <TokenField
                  label="API Token"
                  value={meshulamApiToken}
                  onChange={setMeshulamApiToken}
                  placeholder="הדבק את ה-API Token"
                />
              </div>
            )}

            {/* D. Morning credentials */}
            {paymentGateway === 'morning' && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  פרטי חיבור Morning
                </p>
                <TokenField
                  label="API Key (ID)"
                  value={morningApiKey}
                  onChange={setMorningApiKey}
                  placeholder="המזהה (ID) מחשבון Morning שלך"
                />
                <TokenField
                  label="API Secret"
                  value={morningApiSecret}
                  onChange={setMorningApiSecret}
                  placeholder="הסיסמה (Secret) מחשבון Morning שלך"
                />
              </div>
            )}

            {/* E. Payment rules */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <p className="text-sm font-semibold text-foreground">כללי תשלום</p>
              <div className="space-y-2">
                {([
                  {
                    value: 'full' as PaymentType,
                    label: 'תשלום מלא',
                    desc: 'הלקוח משלם את מלוא הסכום בעת ההזמנה',
                  },
                  {
                    value: 'deposit' as PaymentType,
                    label: 'מקדמה בלבד',
                    desc: 'הלקוח משלם מקדמה — היתרה בסלון',
                  },
                ]).map(({ value, label, desc }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentType === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={value}
                      checked={paymentType === value}
                      onChange={() => setPaymentType(value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {paymentType === 'deposit' && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-sm font-semibold">סכום מקדמה (₪)</Label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="לדוגמה: 50"
                    className="h-11 rounded-xl border-2"
                    dir="ltr"
                    min="0"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ── Section 2: Offline ───────────────────────────────────── */}
      <Card icon={Banknote} title="תשלום אופליין">
        <ToggleRow
          label="תשלום במזומן בעסק"
          description="אפשר ללקוחות לשלם במזומן בסלון ללא תשלום מראש"
          checked={cashEnabled}
          onChange={setCashEnabled}
        />
      </Card>

      {/* Save button */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !businessId}
        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-gold-sm"
      >
        {saveMutation.isPending ? (
          <><Loader2 className="w-5 h-5 animate-spin" />שומר...</>
        ) : (
          'שמור הגדרות'
        )}
      </button>
    </div>
  );
}
