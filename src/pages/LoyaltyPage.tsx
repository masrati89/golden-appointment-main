/**
 * LoyaltyPage — /b/:slug/loyalty
 * ──────────────────────────────
 * Requires the customer to be logged in (magic-link auth).
 * Guest visitors see a login prompt instead of the points lookup.
 *
 * Points and coupons are fetched by client_id (the Supabase auth user ID),
 * not by phone number. This ensures points belong to a verified identity.
 *
 * Uses BusinessProvider (wrapping /b/:slug/* routes) for businessId.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/contexts/BusinessContext';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useSettings } from '@/hooks/useSettings';
import {
  Heart,
  ArrowRight,
  Ticket,
  Star,
  Loader2,
  LogIn,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LoyaltyProgram {
  is_active: boolean;
  points_per_booking: number;
  points_for_reward: number;
  reward_description: string;
}

interface CustomerPoints {
  total_points: number;
  total_bookings: number;
}

interface Coupon {
  id: string;
  code: string;
  discount_description: string;
  expires_at: string | null;
  created_at: string;
}

interface CustomerProfile {
  full_name: string;
  phone: string | null;
}

// ─── Login prompt ─────────────────────────────────────────────────────────────
function LoginPrompt({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-8 rounded-2xl text-center space-y-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ background: primaryColor + '20' }}
      >
        <Heart className="w-8 h-8" style={{ color: primaryColor }} />
      </div>
      <div>
        <h2 className="font-bold text-foreground text-lg">תוכנית נאמנות</h2>
        <p className="text-sm text-muted-foreground mt-1">
          כדי לצפות בנקודות ובקופונים שלך, עליך להיות מחובר
        </p>
      </div>
      <Button
        className="w-full h-12 font-semibold"
        style={{ background: primaryColor }}
        onClick={() =>
          navigate(
            `/auth/login?next=${encodeURIComponent(
              `/register/customer?next=${encodeURIComponent(`/b/${slug}/loyalty`)}`
            )}`
          )
        }
      >
        <LogIn className="w-5 h-5" />
        התחבר / הרשם
      </Button>
      <p className="text-xs text-muted-foreground">
        ההתחברות חינמית ומהירה — קישור נשלח לאימייל שלך
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LoyaltyPage() {
  const navigate = useNavigate();
  const { businessId, business, isLoading: businessLoading, notFound } = useBusiness();
  const { user, isAuthenticated, isLoading: authLoading } = useClientAuth();
  const { data: settings } = useSettings(businessId);

  const primaryColor = settings?.primary_color ?? '#D4AF37';

  // ── Query: loyalty program ────────────────────────────────────────────────
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['loyalty-program-public', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('is_active, points_per_booking, points_for_reward, reward_description')
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyProgram | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Query: customer's own points (by client_id) ───────────────────────────
  const { data: pointsRow, isLoading: pointsLoading } = useQuery({
    queryKey: ['my-loyalty-points', businessId, user?.id],
    enabled: !!businessId && !!user?.id,
    queryFn: async () => {
      if (!businessId || !user?.id) return null;
      const { data, error } = await supabase
        .from('customer_points')
        .select('total_points, total_bookings')
        .eq('business_id', businessId)
        .eq('client_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CustomerPoints | null;
    },
  });

  // ── Query: customer's active coupons (by client_id) ───────────────────────
  const now = new Date().toISOString();
  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['my-loyalty-coupons', businessId, user?.id],
    enabled: !!businessId && !!user?.id,
    queryFn: async () => {
      if (!businessId || !user?.id) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, discount_description, expires_at, created_at')
        .eq('business_id', businessId)
        .eq('client_id', user.id)
        .eq('is_used', false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  // ── Query: customer profile (name) ────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ['customer-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return null;
      return data as CustomerProfile | null;
    },
  });

  // ── Loading / not found ───────────────────────────────────────────────────
  if (businessLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">העסק לא נמצא</p>
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const currentPoints   = pointsRow?.total_points ?? 0;
  const pointsForReward = program?.points_for_reward ?? 100;
  const progressPct     = Math.min(100, Math.round((currentPoints / pointsForReward) * 100));
  const displayName     = profile?.full_name ?? user?.email ?? '';

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{ background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)' }}
    >
      {/* Back nav */}
      <div className="p-4">
        <button
          onClick={() => navigate(`/b/${business?.slug}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          חזור לדף העסק
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pb-16 space-y-5">

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          {settings?.business_logo_url && (
            <img
              src={settings.business_logo_url}
              alt={business?.name}
              className="w-16 h-16 object-contain rounded-2xl mx-auto mb-3 border border-border"
              loading="lazy"
            />
          )}
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <Heart className="w-6 h-6" style={{ color: primaryColor }} />
            תוכנית נאמנות
          </h1>
          {business?.name && (
            <p className="text-muted-foreground text-sm">{business.name}</p>
          )}
        </div>

        {/* Program inactive */}
        {!programLoading && program && !program.is_active && (
          <div className="glass-card p-6 rounded-2xl text-center text-muted-foreground space-y-2">
            <Heart className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-medium">עסק זה אינו מפעיל תוכנית נאמנות כרגע</p>
          </div>
        )}

        {/* Program exists and active */}
        {program?.is_active && (
          <>
            {/* Not authenticated → show login prompt */}
            {!isAuthenticated && (
              <LoginPrompt slug={business?.slug ?? ''} primaryColor={primaryColor} />
            )}

            {/* Authenticated → show points */}
            {isAuthenticated && (
              <>
                {/* User greeting */}
                {displayName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                    <User className="w-4 h-4" />
                    <span>שלום, <span className="font-semibold text-foreground">{displayName}</span></span>
                    {!profile && (
                      <button
                        onClick={() =>
                          navigate(
                            `/register/customer?next=${encodeURIComponent(`/b/${business?.slug}/loyalty`)}`
                          )
                        }
                        className="text-primary text-xs underline underline-offset-2 mr-auto"
                      >
                        השלם פרופיל
                      </button>
                    )}
                  </div>
                )}

                {/* Points loading */}
                {pointsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">טוען נקודות...</span>
                  </div>
                ) : pointsRow === null ? (
                  /* No points yet */
                  <div className="glass-card p-6 rounded-2xl text-center space-y-3">
                    <Star className="w-10 h-10 mx-auto opacity-40 text-muted-foreground" />
                    <p className="font-medium text-foreground">אין לך עדיין נקודות</p>
                    <p className="text-sm text-muted-foreground">
                      הנקודות יצברו אוטומטית לאחר כל תור מאושר
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => navigate(`/b/${business?.slug}/book`)}
                    >
                      קבע תור ראשון →
                    </Button>
                  </div>
                ) : (
                  /* Points card */
                  <div className="glass-card p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-foreground">הנקודות שלך</h2>
                      <Badge
                        className="text-sm font-bold px-3 py-1"
                        style={{
                          background:   primaryColor + '20',
                          color:        primaryColor,
                          borderColor:  primaryColor + '40',
                        }}
                      >
                        {currentPoints} נקודות
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{currentPoints} / {pointsForReward} נקודות לפרס הבא</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progressPct}%`, background: primaryColor }}
                        />
                      </div>
                      {progressPct >= 100 && (
                        <p className="text-sm font-semibold text-center" style={{ color: primaryColor }}>
                          כל הכבוד! הגעת לפרס — פנה לצוות העסק לפדות אותו
                        </p>
                      )}
                    </div>

                    {/* Reward description */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">הפרס שמחכה לך</p>
                      <p className="font-semibold text-foreground">{program.reward_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        עוד {Math.max(0, pointsForReward - currentPoints)} נקודות לפרס הבא
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      {pointsRow.total_bookings} תורים בסה״כ
                    </p>
                  </div>
                )}

                {/* Active coupons */}
                {!couponsLoading && coupons.length > 0 && (
                  <div className="glass-card p-5 rounded-2xl space-y-3">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      הקופונים שלך ({coupons.length})
                    </h2>
                    <div className="space-y-2">
                      {coupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{coupon.discount_description}</p>
                            {coupon.expires_at && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                בתוקף עד: {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                          <span
                            className="font-mono font-bold text-sm tracking-wider px-3 py-1 rounded-lg flex-shrink-0"
                            style={{ background: primaryColor + '20', color: primaryColor }}
                          >
                            {coupon.code}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      הצג את הקוד לצוות העסק בעת הביקור הבא שלך
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Book CTA */}
        <div className="text-center pt-2">
          <Button
            variant="outline"
            className="h-11 px-6"
            onClick={() => navigate(`/b/${business?.slug}/book`)}
          >
            קבע תור חדש →
          </Button>
        </div>
      </div>
    </div>
  );
}
