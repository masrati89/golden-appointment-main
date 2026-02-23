/**
 * AdminLoyalty — /admin/loyalty
 * ─────────────────────────────
 * Manage the business's loyalty program:
 *   A. Toggle program on/off + save
 *   B. Edit rules (points_per_booking, points_for_reward, reward_description)
 *   C. Customer leaderboard (top 20 by points, masked phones)
 *   D. Coupon management (list, filter active/used, mark as used)
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Heart,
  Trophy,
  Ticket,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

// ─── Phone masking ────────────────────────────────────────────────────────────
// Never display a full phone number in any table or view.
// Format: 05X-XXX-*** (last 3 digits hidden)
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const visible = digits.slice(0, Math.max(0, digits.length - 3));
  // Format as 05X-XXX-***
  const part1 = visible.slice(0, 3);
  const part2 = visible.slice(3, 6);
  return `${part1}-${part2 || 'XXX'}-***`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoyaltyProgram {
  id?: string;
  business_id: string;
  is_active: boolean;
  points_per_booking: number;
  points_for_reward: number;
  reward_description: string;
}

interface CustomerPoint {
  id: string;
  customer_phone: string;
  total_points: number;
  total_bookings: number;
  last_updated: string;
}

interface Coupon {
  id: string;
  customer_phone: string;
  code: string;
  discount_description: string;
  is_used: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-bold text-foreground text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminLoyalty() {
  const queryClient = useQueryClient();
  const { businessId } = useAdminAuth();

  // Local form state (mirrors loyalty program data)
  const [form, setForm] = useState<Omit<LoyaltyProgram, 'id' | 'business_id'>>({
    is_active:          false,
    points_per_booking: 10,
    points_for_reward:  100,
    reward_description: 'הנחה מיוחדת ללקוח נאמן',
  });

  // Coupon filter: 'all' | 'active' | 'used'
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'used'>('all');

  // ── Query: load loyalty program ───────────────────────────────────────────
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['loyalty-program', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyProgram | null;
    },
  });

  // Sync form state whenever the DB data loads
  useEffect(() => {
    if (program) {
      setForm({
        is_active:          program.is_active,
        points_per_booking: program.points_per_booking,
        points_for_reward:  program.points_for_reward,
        reward_description: program.reward_description,
      });
    }
  }, [program]);

  // ── Query: customer leaderboard ───────────────────────────────────────────
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['loyalty-leaderboard', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('customer_points')
        .select('id, customer_phone, total_points, total_bookings, last_updated')
        .eq('business_id', businessId)
        .order('total_points', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as CustomerPoint[];
    },
  });

  // ── Query: coupons ────────────────────────────────────────────────────────
  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['loyalty-coupons', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  // ── Mutation: upsert loyalty program ─────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error('מזהה עסק חסר');

      // Validate inputs
      if (form.points_per_booking < 1) throw new Error('נקודות לתור חייבות להיות לפחות 1');
      if (form.points_for_reward < 10) throw new Error('נקודות לפרס חייבות להיות לפחות 10');
      if (!form.reward_description.trim()) throw new Error('יש להזין תיאור פרס');

      const { error } = await supabase
        .from('loyalty_programs')
        .upsert(
          {
            business_id:        businessId,
            is_active:          form.is_active,
            points_per_booking: form.points_per_booking,
            points_for_reward:  form.points_for_reward,
            reward_description: form.reward_description.trim(),
            updated_at:         new Date().toISOString(),
          },
          { onConflict: 'business_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program', businessId] });
      toast.success('הגדרות תוכנית הנאמנות נשמרו');
    },
    onError: (err: any) => {
      console.error('[Loyalty] Save error:', err);
      toast.error(`שגיאה בשמירה: ${err?.message ?? 'שגיאה לא ידועה'}`);
    },
  });

  // ── Mutation: mark coupon as used ─────────────────────────────────────────
  const markUsedMutation = useMutation({
    mutationFn: async (couponId: string) => {
      if (!businessId) throw new Error('מזהה עסק חסר');
      // Security: always scope the update to the admin's own business to prevent
      // cross-tenant coupon redemption.
      const { error } = await supabase
        .from('coupons')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', couponId)
        .eq('business_id', businessId);  // tenant isolation guard
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-coupons', businessId] });
      toast.success('הקופון סומן כנוצל');
    },
    onError: (err: any) => {
      console.error('[Loyalty] Mark used error:', err);
      toast.error(`שגיאה: ${err?.message ?? 'שגיאה לא ידועה'}`);
    },
  });

  // ── Filtered coupons ──────────────────────────────────────────────────────
  const filteredCoupons = coupons.filter((c) => {
    if (couponFilter === 'active') return !c.is_used;
    if (couponFilter === 'used')   return c.is_used;
    return true;
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const bookingsPerReward =
    form.points_per_booking > 0
      ? Math.ceil(form.points_for_reward / form.points_per_booking)
      : '?';

  const activeCouponCount  = coupons.filter((c) => !c.is_used).length;
  const usedCouponCount    = coupons.filter((c) => c.is_used).length;

  if (!businessId) {
    return (
      <div className="text-center py-24 text-muted-foreground">טוען...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl pb-24" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Heart className="w-7 h-7 text-primary" />
          תוכנית נאמנות
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          תגמול לקוחות חוזרים — נקודות אוטומטיות בכל תור מאושר
        </p>
      </div>

      {/* ── Section A: Toggle & Status ────────────────────────────────── */}
      <Section title="הפעלת התוכנית" icon={<Heart className="w-5 h-5" />}>
        {programLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> טוען...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 min-h-[48px]">
              <div>
                <p className="font-semibold text-foreground">הפעל תוכנית נאמנות</p>
                <p className="text-xs text-muted-foreground">
                  כשמופעלת, לקוחות צוברים נקודות בכל תור מאושר
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <div className="flex items-center gap-2">
              {form.is_active ? (
                <Badge className="bg-green-500/15 text-green-700 border-green-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> פעיל
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> לא פעיל
                </Badge>
              )}
            </div>

            <Button
              className="w-full h-11"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
                : <><Save className="w-4 h-4" /> שמור הגדרות</>}
            </Button>
          </>
        )}
      </Section>

      {/* ── Section B: Program Rules ──────────────────────────────────── */}
      <Section title="כללי התוכנית" icon={<Trophy className="w-5 h-5" />}>
        <div className={`space-y-4 ${!form.is_active ? 'opacity-50 pointer-events-none' : ''}`}>
          {!form.is_active && (
            <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
              הפעל את התוכנית כדי לערוך את הכללים
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">
                נקודות לכל תור
              </Label>
              <Input
                type="number"
                min={1}
                value={form.points_per_booking}
                onChange={(e) =>
                  setForm((f) => ({ ...f, points_per_booking: Math.max(1, Number(e.target.value)) }))
                }
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                כמה נקודות מרוויח לקוח בכל תור
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-1.5 block">
                נקודות לפרס
              </Label>
              <Input
                type="number"
                min={10}
                value={form.points_for_reward}
                onChange={(e) =>
                  setForm((f) => ({ ...f, points_for_reward: Math.max(10, Number(e.target.value)) }))
                }
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                כמה נקודות נדרשות לקבלת פרס
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-1.5 block">תיאור הפרס</Label>
            <Textarea
              value={form.reward_description}
              onChange={(e) => setForm((f) => ({ ...f, reward_description: e.target.value }))}
              placeholder="לדוגמה: תספורת חינם, 20% הנחה על הטיפול הבא"
              className="rounded-xl min-h-[80px]"
              dir="rtl"
            />
          </div>

          {/* Visual preview */}
          {form.points_per_booking > 0 && form.points_for_reward > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-primary">
                כל {bookingsPerReward} תורים = {form.reward_description || 'פרס'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ({form.points_per_booking} נקודות × {bookingsPerReward} תורים ≥ {form.points_for_reward} נקודות לפרס)
              </p>
            </div>
          )}

          <Button
            className="w-full h-11"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.is_active}
          >
            {saveMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</>
              : <><Save className="w-4 h-4" /> שמור כללים</>}
          </Button>
        </div>
      </Section>

      {/* ── Section C: Customer Leaderboard ──────────────────────────── */}
      <Section title={`לוח מצטיינים (${leaderboard.length} לקוחות)`} icon={<Users className="w-5 h-5" />}>
        {leaderboardLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> טוען...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">אין עדיין נקודות לקוחות</p>
            <p className="text-xs mt-1">הנקודות יצברו אוטומטית בכל תור מאושר</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">טלפון</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">נקודות</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">תורים</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">עודכן</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((cp, idx) => (
                  <tr key={cp.id} className="hover:bg-secondary/40">
                    <td className="py-2 px-3 text-muted-foreground">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono text-sm">{maskPhone(cp.customer_phone)}</td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-primary">{cp.total_points}</span>
                      {form.points_for_reward > 0 && (
                        <span className="text-xs text-muted-foreground">
                          /{form.points_for_reward}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{cp.total_bookings}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {cp.last_updated
                        ? format(new Date(cp.last_updated), 'dd/MM/yy')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Section D: Coupons Management ────────────────────────────── */}
      <Section
        title={`קופונים (${activeCouponCount} פעילים, ${usedCouponCount} שנוצלו)`}
        icon={<Ticket className="w-5 h-5" />}
      >
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'used'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setCouponFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${
                couponFilter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? `הכל (${coupons.length})` : f === 'active' ? `פעילים (${activeCouponCount})` : `שנוצלו (${usedCouponCount})`}
            </button>
          ))}
        </div>

        {couponsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> טוען...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">אין קופונים להצגה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">קוד</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">טלפון</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">נוצר</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">תפוגה</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">סטטוס</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCoupons.map((coupon) => {
                  const isExpired =
                    coupon.expires_at && new Date(coupon.expires_at) < new Date();

                  return (
                    <tr key={coupon.id} className="hover:bg-secondary/40">
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-primary text-sm tracking-wide">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-sm">{maskPhone(coupon.customer_phone)}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {format(new Date(coupon.created_at), 'dd/MM/yy')}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {coupon.expires_at
                          ? format(new Date(coupon.expires_at), 'dd/MM/yy')
                          : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {coupon.is_used ? (
                          <Badge className="bg-muted text-muted-foreground text-xs">נוצל</Badge>
                        ) : isExpired ? (
                          <Badge className="bg-destructive/15 text-destructive text-xs">פג תוקף</Badge>
                        ) : (
                          <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-xs">פעיל</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {!coupon.is_used && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => markUsedMutation.mutate(coupon.id)}
                            disabled={markUsedMutation.isPending}
                          >
                            {markUsedMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'סמן כנוצל'
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
