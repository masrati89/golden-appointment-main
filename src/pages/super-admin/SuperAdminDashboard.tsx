/**
 * SuperAdminDashboard — /super-admin/dashboard
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Calendar, DollarSign, AlertTriangle,
  MessageCircle, Search, Plus,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  RefreshCw, Bell
} from 'lucide-react';
import {
  useSuperAdminOverview, useBusinessList,
  useSubscriptionAlerts, useToggleBusinessActive, useResolveAlert,
} from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

function StatCard({ icon, label, value, sub, urgent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; urgent?: boolean }) {
  return (
    <div className={`glass-card p-5 rounded-2xl ${urgent ? 'border-2 border-destructive/40 bg-destructive/5' : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{icon}</div>
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${urgent ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function SubStatusBadge({ status, end }: { status: string; end?: string }) {
  const isExpired = end && new Date(end) < new Date();
  const isSoon = end && !isExpired && new Date(end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (status === 'active' && !isSoon) return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-xs">פעיל</Badge>;
  if (isSoon) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs">פג בקרוב</Badge>;
  if (isExpired || status === 'past_due') return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">פג</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [toggleTarget, setToggleTarget] = useState<{ id: string; name: string; active: boolean } | null>(null);

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useSuperAdminOverview();
  const { data: businessData, isLoading: bizLoading } = useBusinessList(page, debouncedSearch);
  const { data: alerts } = useSubscriptionAlerts();
  const toggleActive = useToggleBusinessActive();
  const resolveAlert = useResolveAlert();

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(() => { setDebounced(val); setPage(0); }, 350);
  };

  const businesses = businessData?.businesses ?? [];
  const totalPages = Math.ceil((businessData?.total ?? 0) / (businessData?.pageSize ?? 20));
  const alertLabels: Record<string, string> = { expiring_soon: 'מנוי עומד לפוג', expired: 'מנוי פג', payment_failed: 'תשלום נכשל' };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לוח בקרה — מנהל מערכת</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchOverview()}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => navigate('/super-admin/businesses/new')}><Plus className="w-4 h-4" /> עסק חדש</Button>
        </div>
      </div>

      {overviewLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <div key={i} className="glass-card p-5 rounded-2xl h-28 animate-pulse bg-muted/30" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Building2 className="w-5 h-5" />} label="עסקים פעילים" value={overview?.active_businesses ?? 0} sub={`${overview?.inactive_businesses ?? 0} מושבתים`} />
          <StatCard icon={<Calendar className="w-5 h-5" />} label="תורים היום" value={overview?.bookings_today ?? 0} sub={`${overview?.bookings_this_month ?? 0} החודש`} />
          <StatCard icon={<DollarSign className="w-5 h-5" />} label="הכנסות החודש" value={`₪${(overview?.revenue_this_month ?? 0).toLocaleString()}`} />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="מנויים שפגו" value={overview?.expired_subscriptions ?? 0} urgent={(overview?.expired_subscriptions ?? 0) > 0} />
        </div>
      )}

      {(overview?.whatsapp_pending ?? 0) > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{overview!.whatsapp_pending} תורים ממתינים לשליחת WhatsApp</p>
          </div>
          <Button variant="outline" size="sm" className="mr-auto border-amber-500/40" onClick={() => navigate('/super-admin/whatsapp')}>בדוק</Button>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-destructive" />
            <h2 className="font-bold text-foreground">התראות ({alerts.length})</h2>
          </div>
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{alertLabels[alert.alert_type]} — {(alert as any).businesses?.name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/businesses/${alert.business_id}`)}>פתח</Button>
                <Button variant="ghost" size="sm" onClick={() => resolveAlert.mutate(alert.id)}><CheckCircle className="w-4 h-4 text-green-600" /></Button>
              </div>
            </div>
          ))}
          {alerts.length > 5 && <p className="text-xs text-center text-muted-foreground">ועוד {alerts.length - 5} התראות</p>}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי שם עסק..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pr-9 h-10" />
          </div>
          <p className="text-sm text-muted-foreground flex-shrink-0">{businessData?.total ?? 0} עסקים</p>
        </div>
        {bizLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-7 h-7 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-3" />
            טוען...
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>לא נמצאו עסקים</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {businesses.map((biz) => (
              <div key={biz.id} className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => navigate(`/super-admin/businesses/${biz.id}`)}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${biz.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm truncate">{biz.name}</p>
                    {biz.subscription && <SubStatusBadge status={biz.subscription.status} end={biz.subscription.current_period_end} />}
                  </div>
                  <p className="text-xs text-muted-foreground">myapp.com/b/{biz.slug} · {biz.type || 'לא צוין'} · {biz.phone || 'אין טלפון'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => window.open(`/b/${biz.slug}`, '_blank')}>צפה</Button>
                  <Button variant="ghost" size="sm" className={`text-xs h-8 ${biz.is_active ? 'text-destructive hover:bg-destructive/10' : 'text-green-600 hover:bg-green-500/10'}`}
                    onClick={() => setToggleTarget({ id: biz.id, name: biz.name, active: biz.is_active })}>
                    {biz.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronRight className="w-4 h-4" /> הקודם</Button>
            <p className="text-sm text-muted-foreground">עמוד {page + 1} מתוך {totalPages}</p>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>הבא <ChevronLeft className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!toggleTarget} onOpenChange={() => setToggleTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.active ? 'השבתת עסק' : 'הפעלת עסק'}</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.active ? `האם לכבות את "${toggleTarget?.name}"?` : `האם להפעיל מחדש את "${toggleTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction className={toggleTarget?.active ? 'bg-destructive hover:bg-destructive/90' : ''}
              onClick={() => { if (toggleTarget) { toggleActive.mutate({ id: toggleTarget.id, is_active: !toggleTarget.active }); setToggleTarget(null); } }}>
              {toggleTarget?.active ? 'כבה' : 'הפעל'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
