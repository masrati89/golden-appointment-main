/**
 * BusinessDetail — /super-admin/businesses/:id
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, RefreshCw, Calendar, DollarSign, MessageCircle, AlertTriangle, Save, Clock, Loader2, Plus } from 'lucide-react';
import { useBusinessDetail, useUpdateBusiness, useRenewSubscription, useAuditLog } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const operationLabels: Record<string, string> = { INSERT: 'נוצר', UPDATE: 'עודכן', DELETE: 'נמחק' };

function MiniStat({ label, value, icon, warn }: { label: string; value: string | number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`glass-card p-4 rounded-2xl ${warn ? 'border border-amber-500/30 bg-amber-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={warn ? 'text-amber-600' : 'text-primary'}>{icon}</span>
      </div>
      <p className={`text-xl font-bold ${warn ? 'text-amber-700' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useBusinessDetail(id ?? null);
  const updateBusiness = useUpdateBusiness();
  const renewSub = useRenewSubscription();
  const { data: auditLog } = useAuditLog(id ?? '', 30);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }
  if (!data?.business) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p>העסק לא נמצא</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/super-admin/dashboard')}>חזור</Button>
      </div>
    );
  }

  const { business, stats } = data;
  const sub = (business as any).subscriptions?.[0];
  const isExpired = sub && new Date(sub.current_period_end) < new Date();
  const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000)) : 0;

  const startEdit = () => {
    setForm({ name: business.name, slug: business.slug, type: business.type ?? '', phone: business.phone ?? '', address: business.address ?? '', notes: business.notes ?? '' });
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateBusiness.mutateAsync({ id: business.id, ...form });
    setEditing(false);
  };

  const createAdminUser = async () => {
    if (!newAdminEmail || !newAdminPassword) return;
    setCreatingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { email: newAdminEmail, password: newAdminPassword, business_id: business.id },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'שגיאה');
      toast.success(`אדמין נוצר בהצלחה — ${newAdminEmail}`);
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      toast.error('שגיאה ביצירת אדמין: ' + err.message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/dashboard')}><ArrowRight className="w-4 h-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{business.name}</h1>
            <div className={`w-2.5 h-2.5 rounded-full ${business.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          </div>
          <p className="text-sm text-muted-foreground">myapp.com/b/{business.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/b/${business.slug}`, '_blank')}><ExternalLink className="w-4 h-4" /> צפה בעסק</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="תורים 30 יום" value={stats.total_30d} icon={<Calendar className="w-4 h-4" />} />
        <MiniStat label="הכנסות 30 יום" value={`₪${stats.revenue_30d.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} />
        <MiniStat label="WhatsApp נשלח" value={`${stats.whatsapp_sent}/${stats.total_30d}`} icon={<MessageCircle className="w-4 h-4" />} warn={stats.whatsapp_failed > 0} />
        <MiniStat label="ביטולים" value={stats.cancelled_30d} icon={<AlertTriangle className="w-4 h-4" />} warn={stats.cancelled_30d > 5} />
      </div>

      <div className={`glass-card p-5 rounded-2xl ${isExpired ? 'border-2 border-destructive/40 bg-destructive/5' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">מנוי</h2>
          {isExpired ? <Badge className="bg-destructive/15 text-destructive border-destructive/30">פג</Badge> : <Badge className="bg-green-500/15 text-green-700 border-green-500/30">{daysLeft} ימים נותרו</Badge>}
        </div>
        {sub ? (
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div><p className="text-muted-foreground text-xs">תוכנית</p><p className="font-semibold capitalize">{sub.plan}</p></div>
            <div><p className="text-muted-foreground text-xs">סטטוס</p><p className="font-semibold">{sub.status}</p></div>
            <div><p className="text-muted-foreground text-xs">מסתיים</p><p className="font-semibold">{format(new Date(sub.current_period_end), 'dd/MM/yyyy')}</p></div>
          </div>
        ) : <p className="text-sm text-muted-foreground mb-4">אין מנוי פעיל</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => renewSub.mutate({ businessId: business.id, months: 1 })} disabled={renewSub.isPending}><RefreshCw className="w-4 h-4" /> חדש חודש</Button>
          <Button size="sm" variant="outline" onClick={() => renewSub.mutate({ businessId: business.id, months: 12 })} disabled={renewSub.isPending}>חדש שנה</Button>
        </div>
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground">פרטי עסק</h2>
          {!editing ? <Button variant="outline" size="sm" onClick={startEdit}>עריכה</Button> : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>ביטול</Button>
              <Button size="sm" onClick={saveEdit} disabled={updateBusiness.isPending}><Save className="w-4 h-4" /> שמור</Button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{ key: 'name', label: 'שם העסק' }, { key: 'slug', label: 'Slug (URL)' }, { key: 'type', label: 'סוג עסק' }, { key: 'phone', label: 'טלפון' }, { key: 'address', label: 'כתובת' }, { key: 'notes', label: 'הערות פנימיות' }].map(({ key, label }) => (
              <div key={key}><Label className="text-xs">{label}</Label><Input value={form[key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="h-9 mt-1" /></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[['שם', business.name], ['Slug', business.slug], ['סוג', business.type ?? '—'], ['טלפון', business.phone ?? '—'], ['כתובת', business.address ?? '—'], ['הערות', business.notes ?? '—'], ['נוצר', format(new Date(business.created_at), 'dd/MM/yyyy')], ['סטטוס', business.is_active ? 'פעיל' : 'מושבת']].map(([k, v]) => (
              <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
            ))}
          </div>
        )}
      </div>

      {stats.whatsapp_failed > 0 && (
        <div className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">{stats.whatsapp_failed} תורים שלא קיבלו WhatsApp בחודש האחרון</p>
              <p className="text-xs text-amber-600">ייתכן שה-API token לא תקין או שיש בעיה בהגדרות WhatsApp של העסק</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-foreground">היסטוריית שינויים (30 אחרונים)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">כל שינוי בתורים מתועד כאן</p>
        </div>
        {!auditLog?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">אין שינויים מתועדים</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {auditLog.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.operation === 'INSERT' ? 'bg-green-500' : log.operation === 'DELETE' ? 'bg-destructive' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{operationLabels[log.operation] ?? log.operation}</span> תור
                  {log.new_data?.customer_name && <span className="text-muted-foreground"> — {log.new_data.customer_name}</span>}
                  {log.new_data?.booking_date && <span className="text-muted-foreground"> · {log.new_data.booking_date}</span>}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5 rounded-2xl">
        <h2 className="font-bold text-foreground mb-1">צור אדמין לעסק</h2>
        <p className="text-xs text-muted-foreground mb-4">המשתמש יוכל להתחבר ל-/admin/login ולנהל את העסק הזה בלבד</p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">אימייל</Label>
            <Input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@business.com" className="mt-1 h-10" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">סיסמה זמנית</Label>
            <Input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="לפחות 8 תווים" className="mt-1 h-10" dir="ltr" />
          </div>
          <Button className="w-full" onClick={createAdminUser}
            disabled={!newAdminEmail || !newAdminPassword.length || creatingAdmin}>
            {creatingAdmin
              ? <><Loader2 className="w-4 h-4 animate-spin" />יוצר...</>
              : <><Plus className="w-4 h-4" />צור אדמין</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
