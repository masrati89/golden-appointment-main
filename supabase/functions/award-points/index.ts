/**
 * award-points — Loyalty Program Points Engine
 * ─────────────────────────────────────────────
 * Called via Supabase Database Webhook when a booking's status
 * changes to 'confirmed'.
 *
 * Webhook setup (Supabase Dashboard → Database → Webhooks):
 *   Table:  public.bookings
 *   Events: UPDATE
 *   URL:    https://<project>.supabase.co/functions/v1/award-points
 *
 * Also accepts direct invocation with { booking_id } for manual triggers.
 *
 * PATCH (2026-02-23): Only registered customers earn points.
 *   - booking.client_id must be non-null (linked Supabase auth user)
 *   - Guest bookings (client_id = null) are silently skipped
 *   - Points and coupons are keyed by client_id, not just phone
 *
 * Security: uses service_role key to bypass RLS for server-side writes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Generate a unique coupon code: GOLD-XXXXXX (6 uppercase alphanumeric chars) */
function generateCouponCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GOLD-${suffix}`;
}

/** Mask phone for logging: show only last 3 digits */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 3) return "***";
  return `***${phone.slice(-3)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Use service_role client — bypasses RLS so we can write to customer_points/coupons
  const supabase    = createClient(supabaseUrl, serviceKey);

  // ── Auth guard ───────────────────────────────────────────────────────────
  // Accept the service_role key (DB webhooks) OR a valid user JWT (manual call).
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: "Authorization required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (token !== serviceKey) {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const body = await req.json();

    // ── Resolve booking ID ───────────────────────────────────────────────
    // Supports two call patterns:
    //   1. Supabase DB Webhook: { type, table, record, old_record }
    //   2. Direct invocation:   { booking_id }
    let bookingId: string | null = null;
    let newStatus: string | null = null;
    let oldStatus: string | null = null;

    if (body.type === "UPDATE" && body.record) {
      bookingId = body.record?.id ?? null;
      newStatus = body.record?.status ?? null;
      oldStatus = body.old_record?.status ?? null;
    } else if (body.booking_id) {
      bookingId = body.booking_id;
    }

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Guard: only process status transition → 'confirmed' ─────────────
    if (newStatus !== null && oldStatus !== null) {
      if (newStatus !== "confirmed" || oldStatus === "confirmed") {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "not_a_confirmation_transition" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Fetch booking details ────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, business_id, customer_phone, client_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      console.error("[award-points] Booking not found:", bookingId, bookingErr);
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For direct invocations, confirm booking is actually confirmed
    if (booking.status !== "confirmed") {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "booking_not_confirmed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REGISTERED CUSTOMERS ONLY ────────────────────────────────────────
    // Guest bookings have client_id = null. Skip silently — do NOT award
    // points for unregistered customers.
    const clientId = booking.client_id as string | null;
    if (!clientId) {
      console.log(`[award-points] Skipping guest booking ${bookingId} — no client_id (unregistered customer)`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "guest_no_account" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { business_id, customer_phone } = booking;
    if (!business_id) {
      console.error("[award-points] Missing business_id on booking:", bookingId);
      return new Response(
        JSON.stringify({ success: false, error: "Booking missing business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[award-points] Processing booking ${bookingId} | business ${business_id} | ` +
      `phone ${maskPhone(customer_phone ?? "")} | client ${clientId.slice(0, 8)}...`
    );

    // ── Check loyalty program ────────────────────────────────────────────
    const { data: program, error: programErr } = await supabase
      .from("loyalty_programs")
      .select("is_active, points_per_booking, points_for_reward, reward_description")
      .eq("business_id", business_id)
      .maybeSingle();

    if (programErr) {
      console.error("[award-points] Error fetching loyalty program:", programErr);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "program_fetch_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!program || !program.is_active) {
      console.log(`[award-points] Loyalty program inactive for business ${business_id}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "program_inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { points_per_booking, points_for_reward, reward_description } = program;

    // ── Fetch current balance by client_id ───────────────────────────────
    const { data: existing } = await supabase
      .from("customer_points")
      .select("total_points, total_bookings")
      .eq("business_id", business_id)
      .eq("client_id", clientId)
      .maybeSingle();

    const currentPoints   = existing?.total_points ?? 0;
    const currentBookings = existing?.total_bookings ?? 0;
    const newPoints       = currentPoints + points_per_booking;
    const newBookings     = currentBookings + 1;

    // ── Upsert customer_points by (business_id, client_id) ──────────────
    const { error: upsertErr } = await supabase
      .from("customer_points")
      .upsert(
        {
          business_id,
          customer_phone: customer_phone ?? "",
          client_id:      clientId,
          total_points:   newPoints,
          total_bookings: newBookings,
          last_updated:   new Date().toISOString(),
        },
        { onConflict: "business_id,client_id" }
      );

    if (upsertErr) {
      console.error("[award-points] Failed to upsert customer_points:", upsertErr);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to award points", detail: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[award-points] Awarded ${points_per_booking} pts to client ${clientId.slice(0, 8)}... | ` +
      `total: ${newPoints} | bookings: ${newBookings}`
    );

    // ── Check if reward threshold reached ───────────────────────────────
    let couponGenerated = false;
    let couponCode: string | null = null;

    if (newPoints >= points_for_reward) {
      const pointsAfterReward = newPoints - points_for_reward;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      let attempts = 0;
      let insertError: any = null;

      while (attempts < 3) {
        couponCode = generateCouponCode();
        attempts++;

        const { error: couponErr } = await supabase
          .from("coupons")
          .insert({
            business_id,
            customer_phone:       customer_phone ?? "",
            client_id:            clientId,          // link coupon to auth user
            code:                 couponCode,
            discount_description: reward_description,
            expires_at:           expiresAt.toISOString(),
          });

        if (!couponErr) {
          insertError = null;
          couponGenerated = true;
          break;
        }
        if (couponErr.code === "23505") {
          console.warn(`[award-points] Duplicate code ${couponCode}, retry ${attempts}`);
          insertError = couponErr;
          continue;
        }
        insertError = couponErr;
        break;
      }

      if (!couponGenerated) {
        console.error("[award-points] Failed to generate coupon after 3 attempts:", insertError);
        return new Response(
          JSON.stringify({
            success:          true,
            points_awarded:   points_per_booking,
            total_points:     newPoints,
            coupon_generated: false,
            coupon_error:     insertError?.message,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct redeemed points
      const { error: deductErr } = await supabase
        .from("customer_points")
        .update({ total_points: pointsAfterReward, last_updated: new Date().toISOString() })
        .eq("business_id", business_id)
        .eq("client_id", clientId);

      if (deductErr) {
        console.error("[award-points] Failed to deduct points:", deductErr);
      } else {
        console.log(
          `[award-points] Coupon ${couponCode} generated | ` +
          `points deducted: ${points_for_reward} | remaining: ${pointsAfterReward}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success:          true,
        points_awarded:   points_per_booking,
        total_points:     couponGenerated ? newPoints - points_for_reward : newPoints,
        coupon_generated: couponGenerated,
        coupon_code:      couponGenerated ? couponCode : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[award-points] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
