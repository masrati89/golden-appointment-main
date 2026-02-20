import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { Loader2, Save, Settings, CreditCard, Calendar, Bell, Upload, X } from 'lucide-react';
import { GoogleSyncStatus } from '@/components/GoogleSyncStatus';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const tabs = [
  { id: 'general', label: 'כללי', icon: Settings },
  { id: 'payment', label: 'תשלומים', icon: CreditCard },
  { id: 'booking', label: 'הזמנות', icon: Calendar },
  { id: 'notifications', label: 'התראות', icon: Bell },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { user } = useAdminAuth();
  const { data: settings, isLoading } = useSettings();
  const [form, setForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        show_instagram: settings.show_instagram ?? false,
        show_facebook: settings.show_facebook ?? false,
        instagram_url: settings.instagram_url ?? '',
        facebook_url: settings.facebook_url ?? '',
      });
    }
  }, [settings]);

  // Handle OAuth callback query params - sync first (toast, cleanup URL), then refetch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const success = params.get('success');
    const err = params.get('error');
    const mounted = { current: true };

    if (success === 'true') {
      toast.success('Google Calendar connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        try {
          await queryClient.invalidateQueries({ queryKey: ['settings'] });
        } catch (e) {
          if (mounted.current) console.warn('OAuth callback: settings refetch failed', e);
        }
      })();
      return () => { mounted.current = false; };
    }

    if (connected !== '1' && connected !== '0') return;

    if (connected === '1') {
      toast.success('יומן Google חובר בהצלחה');
    } else {
      toast.error(err ? `חיבור יומן נכשל: ${err}` : 'חיבור יומן גוגל נכשל');
    }
    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
      } catch (e) {
        if (mounted.current) console.warn('OAuth callback: settings refetch failed', e);
      }
    })();

    return () => { mounted.current = false; };
  }, [queryClient]);

  // business_settings columns (single source of truth; no settings table)
  const SETTINGS_COLUMNS = [
    'id', 'admin_phone', 'admin_calendar_email', 'background_image_url', 'bank_account', 'bank_branch', 'bank_name',
    'bit_business_name', 'bit_payment_url', 'bit_phone_number', 'business_address',
    'business_logo_url', 'business_name', 'business_phone', 'deposit_fixed_amount',
    'deposit_percentage', 'google_calendar_id', 'is_deposit_active', 'max_advance_days',
    'min_advance_hours', 'payment_bank_enabled', 'payment_bit_enabled', 'payment_cash_enabled',
    'payment_credit_enabled', 'payment_stripe_enabled', 'primary_color', 'secondary_color',
    'send_confirmation_sms', 'send_reminder_hours', 'slot_duration_min', 'stripe_publishable_key',
    'stripe_secret_key', 'whatsapp_api_token', 'whatsapp_float_number', 'working_days',
    'working_hours_end', 'working_hours_start',
    'instagram_url', 'facebook_url', 'show_instagram', 'show_facebook',
    'whatsapp_enabled',
    'whatsapp_api_url',
    'whatsapp_admin_phone',
    'whatsapp_new_booking_template',
    'client_whatsapp_enabled',
    'whatsapp_client_confirmation_template',
  ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id } = form;
      if (!id) throw new Error('Missing settings id');

      const payload: Record<string, any> = {};
      SETTINGS_COLUMNS.forEach((key) => {
        if (key === 'id') return;
        if (!(key in form)) return;
        const value = form[key];
        payload[key] = value === '' || value === undefined ? null : value;
      });

      const { error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('ההגדרות נשמרו בהצלחה');
    },
    onError: (error: any) => {
      console.error('Error saving settings:', error);
      const errorMessage = error?.message || 'שגיאה בשמירה';
      toast.error(`שגיאה בשמירה: ${errorMessage}`);
    },
  });

  if (!user) return <div className="text-center py-12 text-muted-foreground">טוען...</div>;
  if (isLoading && !settings) return <div className="text-center py-12 text-muted-foreground">טוען...</div>;

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6 max-w-3xl pb-24">
      <h1 className="text-3xl font-bold text-foreground">הגדרות</h1>

      {/* Tabs — flex-wrap so all fit without horizontal scroll */}
      <div className="glass-card p-1.5 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content — instant transition, fixed min-height to prevent layout shift */}
      <div className="min-h-[500px]">
        <motion.div
          key={activeTab}
          className="space-y-6 min-h-full"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0 }}
        >
        {activeTab === 'general' && (
          <>
            <Section title="פרטי עסק">
              <Field label="שם העסק" value={form.business_name} onChange={(v) => update('business_name', v)} />
              <Field label="טלפון" value={form.business_phone} onChange={(v) => update('business_phone', v)} />
              <Field label="כתובת" value={form.business_address} onChange={(v) => update('business_address', v)} />
              <LogoUploadField value={form.business_logo_url} onChange={(v) => update('business_logo_url', v)} />
              <Field label="טלפון מנהל (WhatsApp)" value={form.admin_phone} onChange={(v) => update('admin_phone', v)} />
            </Section>

            <Section title="עיצוב האפליקציה">
              <BackgroundImageUploadField value={form.background_image_url} onChange={(v) => update('background_image_url', v)} />
              <p className="text-xs text-muted-foreground">העלה תמונת רקע מותאמת אישית להצגה בכל הדפים. השאר ריק לרקע ברירת מחדל (בז׳ קרם).</p>
            </Section>

            <Section title="רשתות חברתיות">
              <div className="space-y-4">
                {/* Instagram */}
                <div className="space-y-2">
                  <ToggleRow label="📷 הצג אינסטגרם בדף הבית" checked={form.show_instagram} onChange={(v) => update('show_instagram', v)} />
                  {form.show_instagram && (
                    <Field label="קישור לאינסטגרם (URL)" value={form.instagram_url} onChange={(v) => update('instagram_url', v)} dir="ltr" placeholder="https://instagram.com/your_account" />
                  )}
                </div>

                {/* Facebook */}
                <div className="space-y-2">
                  <ToggleRow label="📘 הצג פייסבוק בדף הבית" checked={form.show_facebook} onChange={(v) => update('show_facebook', v)} />
                  {form.show_facebook && (
                    <Field label="קישור לפייסבוק (URL)" value={form.facebook_url} onChange={(v) => update('facebook_url', v)} dir="ltr" placeholder="https://facebook.com/your_page" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground">הזן את הקישורים המלאים לפרופילים שלך. הלוגואים יופיעו בדף הבית רק אם הפעלת אותם.</p>
              </div>
            </Section>
          </>
        )}

        {activeTab === 'payment' && (
          <>
            <Section title="אמצעי תשלום">
              <ToggleRow label="💵 מזומן" checked={form.payment_cash_enabled} onChange={(v) => update('payment_cash_enabled', v)} />
              <ToggleRow label="🏦 העברה בנקאית" checked={form.payment_bank_enabled} onChange={(v) => update('payment_bank_enabled', v)} />
              <ToggleRow label="📱 Bit" checked={form.payment_bit_enabled} onChange={(v) => update('payment_bit_enabled', v)} />
              <ToggleRow label="💳 אשראי (Stripe)" checked={form.payment_stripe_enabled} onChange={(v) => update('payment_stripe_enabled', v)} />
            </Section>

            {form.payment_bank_enabled && (
              <Section title="פרטי חשבון בנק">
                <Field label="שם בנק" value={form.bank_name} onChange={(v) => update('bank_name', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="סניף" value={form.bank_branch} onChange={(v) => update('bank_branch', v)} />
                  <Field label="מספר חשבון" value={form.bank_account} onChange={(v) => update('bank_account', v)} />
                </div>
              </Section>
            )}

            {form.payment_bit_enabled && (
              <Section title="פרטי Bit">
                <Field label="מספר טלפון Bit" value={form.bit_phone_number} onChange={(v) => update('bit_phone_number', v)} />
                <Field label="שם עסק ב-Bit" value={form.bit_business_name} onChange={(v) => update('bit_business_name', v)} />
                <Field label="קישור תשלום Bit (URL)" value={form.bit_payment_url} onChange={(v) => update('bit_payment_url', v)} dir="ltr" />
                <p className="text-xs text-muted-foreground">הזן את הקישור לתשלום ב-Bit. כשהלקוח ילחץ על כפתור Bit, הוא יועבר לקישור זה.</p>
              </Section>
            )}

            {form.payment_stripe_enabled && (
              <Section title="פרטי Stripe">
                <Field label="Publishable Key" value={form.stripe_publishable_key} onChange={(v) => update('stripe_publishable_key', v)} dir="ltr" type="password" />
                <p className="text-xs text-muted-foreground">המפתח הציבורי מ-Stripe Dashboard. מתחיל ב-pk_</p>
                <Field label="Secret Key" value={form.stripe_secret_key} onChange={(v) => update('stripe_secret_key', v)} dir="ltr" type="password" />
                <p className="text-xs text-muted-foreground">המפתח הסודי מ-Stripe Dashboard. מתחיל ב-sk_. שמור בסוד!</p>
                <p className="text-xs text-muted-foreground mt-2">
                  <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    קבל מפתחות מ-Stripe Dashboard →
                  </a>
                </p>
              </Section>
            )}

            <Section title="מקדמה">
              <ToggleRow label="דרוש מקדמה" checked={form.is_deposit_active} onChange={(v) => update('is_deposit_active', v)} />
              {form.is_deposit_active && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="סכום קבוע (₪)" value={form.deposit_fixed_amount} onChange={(v) => update('deposit_fixed_amount', Number(v))} type="number" />
                  <Field label="אחוז (%)" value={form.deposit_percentage} onChange={(v) => update('deposit_percentage', Number(v))} type="number" />
                </div>
              )}
            </Section>
          </>
        )}

        {activeTab === 'booking' && (
          <>
            <Section title="שעות פעילות">
              <p className="text-xs text-muted-foreground -mt-2 mb-2">הגדר באילו ימים העסק פתוח</p>
              <WorkingDaysConfigurator
                workingDays={form.working_days ?? [0, 1, 2, 3, 4]}
                onChange={(days) => update('working_days', days)}
              />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Field label="שעת התחלה" value={form.working_hours_start} onChange={(v) => update('working_hours_start', v)} type="time" />
                <Field label="שעת סיום" value={form.working_hours_end} onChange={(v) => update('working_hours_end', v)} type="time" />
              </div>
            </Section>
            <Section title="הגדרות הזמנות">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <Field label="זמן מינימלי מראש (שעות)" value={form.min_advance_hours} onChange={(v) => update('min_advance_hours', Number(v))} type="number" />
                <Field label="ימי הזמנה מקסימלי" value={form.max_advance_days} onChange={(v) => update('max_advance_days', Number(v))} type="number" />
              </div>
              <Field label="משך סלוט (דקות)" value={form.slot_duration_min} onChange={(v) => update('slot_duration_min', Number(v))} type="number" />
            </Section>
          </>
        )}

        {activeTab === 'notifications' && (
          <Section title="התראות">
            <ToggleRow label="שלח אישור SMS" checked={form.send_confirmation_sms} onChange={(v) => update('send_confirmation_sms', v)} />
            <Field label="שעות תזכורת לפני תור" value={form.send_reminder_hours} onChange={(v) => update('send_reminder_hours', Number(v))} type="number" />

            <div className="pt-2 border-t border-border/60">
              <Label className="text-sm font-semibold mb-2 block">Google Calendar</Label>
              <GoogleSyncStatus
                isConnected={!!settings?.google_calendar_connected}
                user={user ?? null}
                isLoading={isLoading && !settings}
                onDisconnected={() => setForm((f) => ({ ...f, google_calendar_connected: false }))}
                invalidateSettings={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
              />
            </div>

            <div className="pt-4 border-t border-border/60">
              <Label className="text-sm font-semibold mb-3 block">חיבור לוואטסאפ</Label>
              
              {/* Master Toggle */}
              <ToggleRow 
                label="הפעל התראות WhatsApp אוטומטיות" 
                checked={form.whatsapp_enabled ?? false} 
                onChange={(v) => update('whatsapp_enabled', v)} 
              />

              {/* API Credentials - only show if enabled */}
              {form.whatsapp_enabled && (
                <div className="space-y-4 mt-4">
                  <Field 
                    label="WhatsApp API URL" 
                    value={form.whatsapp_api_url ?? ''} 
                    onChange={(v) => update('whatsapp_api_url', v)} 
                    dir="ltr" 
                    placeholder="https://api.example.com/whatsapp/send"
                  />
                  <p className="text-xs text-muted-foreground -mt-3">
                    כתובת ה-API של ספק ה-WhatsApp שלך (לדוגמה: Green API, Twilio, וכו')
                  </p>

                  <Field 
                    label="WhatsApp API Token" 
                    value={form.whatsapp_api_token ?? ''} 
                    onChange={(v) => update('whatsapp_api_token', v)} 
                    dir="ltr" 
                    type="password"
                    placeholder="הזן את ה-token שלך"
                  />
                  <p className="text-xs text-muted-foreground -mt-3">
                    המפתח הסודי מ-WhatsApp API שלך. שמור בסוד!
                  </p>

                  <Field 
                    label="טלפון מנהל (להתראות)" 
                    value={form.whatsapp_admin_phone ?? ''} 
                    onChange={(v) => update('whatsapp_admin_phone', v)} 
                    dir="ltr" 
                    placeholder="0501234567"
                  />
                  <p className="text-xs text-muted-foreground -mt-3">
                    מספר הטלפון שיקבל התראות על תורים חדשים
                  </p>

                  {/* Template Editor */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">תבנית הודעת התראה</Label>
                    <Textarea
                      value={form.whatsapp_new_booking_template ?? ''}
                      onChange={(e) => update('whatsapp_new_booking_template', e.target.value)}
                      className="min-h-[120px] rounded-xl font-mono text-sm"
                      dir="rtl"
                      placeholder="💖 תור חדש נקבע במכון היופי!&#10;👤 לקוחה: {{name}}&#10;📱 טלפון: {{phone}}&#10;💅 טיפול: {{service}}&#10;📅 תאריך ושעה: {{date}}"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold">משתנים זמינים:</p>
                      <div className="flex flex-wrap gap-2">
                        <code className="bg-secondary px-2 py-1 rounded">{"{{name}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{phone}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{service}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{date}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{time}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{price}}"}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Notifications Sub-section */}
              <div className="pt-4 border-t border-border/60">
                <Label className="text-sm font-semibold mb-3 block">התראות ללקוחות</Label>
                
                {/* Client Toggle */}
                <ToggleRow 
                  label="שלח אישור WhatsApp אוטומטי ללקוחות" 
                  checked={form.client_whatsapp_enabled ?? false} 
                  onChange={(v) => update('client_whatsapp_enabled', v)} 
                />

                {/* Client Template Editor - only show if enabled */}
                {form.client_whatsapp_enabled && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-semibold">תבנית אישור ללקוח</Label>
                    <Textarea
                      value={form.whatsapp_client_confirmation_template ?? ''}
                      onChange={(e) => update('whatsapp_client_confirmation_template', e.target.value)}
                      className="min-h-[120px] rounded-xl font-mono text-sm"
                      dir="rtl"
                      placeholder="היי {{name}} שריינו לך את התור! 🌸&#10;סוג טיפול: {{service}}&#10;מתי? {{date}}&#10;מחכות לראותך!"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold">משתנים זמינים:</p>
                      <div className="flex flex-wrap gap-2">
                        <code className="bg-secondary px-2 py-1 rounded">{"{{name}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{service}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{date}}"}</code>
                        <code className="bg-secondary px-2 py-1 rounded">{"{{time}}"}</code>
                      </div>
                      <p className="text-muted-foreground/80 mt-2">
                        ההודעה תישלח אוטומטית למספר הטלפון שהלקוח הזין בהזמנה
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}
        </motion.div>
      </div>

      {/* Save at bottom only (sticky feel) */}
      <div className="sticky bottom-0 left-0 right-0 pt-4 pb-safe bg-gradient-to-t from-background to-transparent">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור הגדרות
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-bold text-foreground text-lg">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  dir,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  dir?: string;
}) {
  return (
    <div className="flex flex-col justify-center min-h-[40px]">
      <Label className="text-sm font-semibold mb-1.5 block">{label}</Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl"
        dir={dir}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 min-h-[48px]">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={checked ?? false} onCheckedChange={onChange} />
    </div>
  );
}

function LogoUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('יש להעלות קובץ תמונה בלבד');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ מקסימלי 10MB');
      return;
    }
    setUploading(true);
    try {
      // Sanitize filename: remove special characters, keep only alphanumeric and dots
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
      const filePath = `public/${Date.now()}${sanitizedName}`;
      
      // Upload to 'images' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Detailed error logging for debugging
        console.error('Logo upload error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
          details: uploadError,
        });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      
      if (!publicUrl) {
        throw new Error('לא ניתן לקבל כתובת URL ציבורית');
      }

      // Update form state
      onChange(publicUrl);
      
      // Immediately update database
      if (settings?.id) {
        const { error: updateError } = await supabase
          .from('business_settings')
          .update({ business_logo_url: publicUrl })
          .eq('id', settings.id);
        if (updateError) {
          console.error('Database update error:', {
            message: updateError.message,
            statusCode: updateError.statusCode,
            error: updateError.error,
            details: updateError,
          });
          toast.warning('הלוגו הועלה אך לא עודכן במסד הנתונים. אנא שמור הגדרות ידנית.');
        } else {
          queryClient.invalidateQueries({ queryKey: ['settings'] });
        }
      }

      toast.success('הלוגו הועלה בהצלחה');
    } catch (error: any) {
      // User-friendly error message
      const errorMessage = error?.message || 'שגיאה לא ידועה בהעלאת הלוגו';
      console.error('Logo upload failed:', error);
      toast.error(`שגיאה בהעלאת הלוגו: ${errorMessage}`);
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold mb-1.5 block">לוגו העסק</Label>
      {value && (
        <div className="relative w-20 h-20 rounded-xl border border-border overflow-hidden bg-secondary">
          <img src={value} alt="לוגו" className="w-full h-full object-contain" loading="lazy" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="הזן כתובת URL של לוגו..."
          className="h-12 rounded-xl flex-1"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-12 px-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold transition-all flex items-center gap-2 text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          העלאה
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
    </div>
  );
}

function BackgroundImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('יש להעלות קובץ תמונה בלבד');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ מקסימלי 10MB');
      return;
    }
    setUploading(true);
    try {
      // Sanitize filename: remove special characters, keep only alphanumeric and dots
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
      const filePath = `public/${Date.now()}${sanitizedName}`;
      
      // Upload to 'images' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        // Detailed error logging for debugging
        console.error('Background image upload error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
          details: uploadError,
        });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      
      if (!publicUrl) {
        throw new Error('לא ניתן לקבל כתובת URL ציבורית');
      }

      // Update form state
      onChange(publicUrl);
      
      // Immediately update database
      if (settings?.id) {
        const { error: updateError } = await supabase
          .from('business_settings')
          .update({ background_image_url: publicUrl })
          .eq('id', settings.id);
        if (updateError) {
          console.error('Database update error:', {
            message: updateError.message,
            statusCode: updateError.statusCode,
            error: updateError.error,
            details: updateError,
          });
          toast.warning('תמונת הרקע הועלתה אך לא עודכנה במסד הנתונים. אנא שמור הגדרות ידנית.');
        } else {
          queryClient.invalidateQueries({ queryKey: ['settings'] });
        }
      }

      toast.success('תמונת הרקע הועלתה בהצלחה');
    } catch (error: any) {
      // User-friendly error message
      const errorMessage = error?.message || 'שגיאה לא ידועה בהעלאת תמונת הרקע';
      console.error('Background image upload failed:', error);
      toast.error(`שגיאה בהעלאת תמונת הרקע: ${errorMessage}`);
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold mb-1.5 block">תמונת רקע</Label>
      {value && (
        <div className="relative w-full max-w-sm rounded-xl border border-border overflow-hidden bg-secondary aspect-video">
          <img src={value} alt="תמונת רקע" className="w-full h-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md hover:bg-destructive/90"
            title="הסר תמונה"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-12 px-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold transition-all flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {value ? 'החלף תמונה' : 'העלה תמונת רקע'}
        </button>
      </div>
    </div>
  );
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function WorkingDaysConfigurator({
  workingDays,
  onChange,
}: {
  workingDays: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (day: number) => {
    if (workingDays.includes(day)) {
      onChange(workingDays.filter((d) => d !== day));
    } else {
      onChange([...workingDays, day].sort());
    }
  };

  return (
    <div className="space-y-1.5">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const isActive = workingDays.includes(day);
        return (
          <div key={day} className="flex items-center justify-between py-2 min-h-[44px]">
            <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
              יום {DAY_NAMES[day]}
            </span>
            <Switch checked={isActive} onCheckedChange={() => toggle(day)} />
          </div>
        );
      })}
    </div>
  );
}
