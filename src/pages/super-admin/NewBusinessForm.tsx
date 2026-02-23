/**
 * NewBusinessForm — /super-admin/businesses/new
 * -----------------------------------------------
 * טופס יצירת עסק חדש.
 * יוצר אוטומטית: businesses + settings + subscriptions
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import { useCreateBusiness } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 40);
}

export default function NewBusinessForm() {
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const [form, setForm] = useState({
    name:    '',
    slug:    '',
    type:    '',
    phone:   '',
    plan:    'basic' as 'basic' | 'pro',
  });

  const [slugManual, setSlugManual] = useState(false);

  const set = (key: string, val: string) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      // slug אוטומטי מהשם אלא אם המשתמש ערך ידנית
      if (key === 'name' && !slugManual) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) return;
    // L-1: Validate Israeli phone format if provided (05X-XXX-XXXX or 05XXXXXXXX)
    if (form.phone && !/^0(5\d{8}|[23489]\d{7})$/.test(form.phone.replace(/[-\s]/g, ''))) {
      alert('מספר טלפון לא תקין — נא להזין מספר ישראלי (לדוגמה: 050-1234567)');
      return;
    }
    const biz = await createBusiness.mutateAsync(form);
    navigate(`/super-admin/businesses/${biz.id}`);
  };

  return (
    <div className="max-w-lg space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/dashboard')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">עסק חדש</h1>
          <p className="text-sm text-muted-foreground">יוצר אוטומטית: פרופיל + הגדרות + מנוי</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card p-6 rounded-2xl space-y-4">

        <div>
          <Label>שם העסק *</Label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="מכון יופי מאיה"
            className="mt-1 h-11"
          />
        </div>

        <div>
          <Label>
            Slug — כתובת URL *
            <span className="text-xs text-muted-foreground mr-2">(נוצר אוטומטית)</span>
          </Label>
          <div className="flex items-center mt-1 gap-2">
            <span className="text-xs text-muted-foreground flex-shrink-0">/b/</span>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                set('slug', slugify(e.target.value));
              }}
              placeholder="maya-beauty"
              className="h-11"
              dir="ltr"
            />
          </div>
          {form.slug && (
            <p className="text-xs text-primary mt-1">myapp.com/b/{form.slug}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>סוג עסק</Label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full h-11 mt-1 px-3 rounded-xl border-2 border-input bg-background text-sm focus:border-primary"
            >
              <option value="">בחר...</option>
              <option value="salon">מכון יופי / ספא</option>
              <option value="barber">מספרה</option>
              <option value="gym">מאמן כושר</option>
              <option value="nails">ציפורניים</option>
              <option value="makeup">איפור</option>
              <option value="massage">עיסוי</option>
              <option value="other">אחר</option>
            </select>
          </div>

          <div>
            <Label>טלפון</Label>
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="050-000-0000"
              className="mt-1 h-11"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <Label>תוכנית מנוי</Label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {(['basic', 'pro'] as const).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setForm((f) => ({ ...f, plan }))}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.plan === plan
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {plan === 'basic' ? '🥈 Basic — ₪99/חודש' : '🥇 Pro — ₪199/חודש'}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold mt-2"
          onClick={handleSubmit}
          disabled={!form.name || !form.slug || createBusiness.isPending}
        >
          {createBusiness.isPending ? (
            <><Loader2 className="w-5 h-5 animate-spin" />יוצר עסק...</>
          ) : (
            <><Building2 className="w-5 h-5" />צור עסק</>
          )}
        </Button>
      </div>

    </div>
  );
}
