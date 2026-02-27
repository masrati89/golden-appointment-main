/**
 * delete-booking-with-calendar — Google Calendar cleanup on booking deletion
 * ─────────────────────────────────────────────────────────────────────────
 * Called via Supabase Database Webhook when a booking is DELETE'd.
 * The booking row is already gone when this runs — all data comes from
 * the webhook's `old_record` field.
 *
 * Webhook setup (Supabase Dashboard → Database → Webhooks):
 *   Table:  public.bookings
 *   Events: DELETE
 *   URL:    https://<project>.supabase.co/functions/v1/delete-booking-with-calendar
 *   Header: Authorization: Bearer <service_role_key>
 *
 * Security: caller must present the service_role key as Bearer token.
 * JWT verification is disabled at the platform level (--no-verify-jwt).
 * Auth is enforced inside this function by comparing the token against
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * This function never returns an error status for calendar failures —
 * the booking is already deleted and we must not imply rollback.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.warn("[google] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — skipping");
    return null;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.warn("[google] token refresh failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  console.log("[google] access token refreshed OK");
  return data.access_token ?? null;
}

async function deleteGoogleCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  console.log("[google] deleting calendar event:", eventId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (res.status === 204 || res.status === 200) {
    console.log("[google] calendar event deleted");
  } else if (res.status === 404) {
    console.log("[google] event not found (already deleted) — OK");
  } else {
    console.warn("[google] calendar delete returned:", res.status, await res.text());
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Auth guard: only the Supabase system (service_role key) may call this ──
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token || token !== serviceKey) {
    console.error("[auth] Forbidden — invalid or missing service_role token");
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Extract data from DB webhook DELETE payload ──
  // Supabase sends: { type: "DELETE", table, schema, old_record: {...}, record: null }
  const oldRecord = (body.old_record ?? {}) as Record<string, unknown>;
  const calendarEventId = (oldRecord.google_calendar_event_id ?? "") as string;
  const businessId      = (oldRecord.business_id ?? "")             as string;
  const bookingId       = (oldRecord.id ?? "unknown")               as string;

  console.log(`[start] booking ${bookingId} | business ${businessId} | calendar_event_id: ${calendarEventId || "(none)"}`);

  // ── Skip if no calendar event was linked ──
  if (!calendarEventId) {
    console.log("[skip] no calendar event linked — nothing to do");
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: "no_calendar_event" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!businessId) {
    console.warn("[skip] old_record missing business_id — cannot look up refresh token");
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: "no_business_id" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Fetch Google Calendar refresh token for this business ──
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: settings, error: settingsErr } = await supabase
    .from("settings")
    .select("google_calendar_refresh_token")
    .eq("business_id", businessId)
    .maybeSingle();

  if (settingsErr) {
    console.warn("[settings] error fetching refresh token:", settingsErr.message, "— skipping");
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: "settings_fetch_error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const refreshToken = settings?.google_calendar_refresh_token ?? null;
  if (!refreshToken) {
    console.log("[skip] no Google Calendar refresh token for business — skipping");
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: "no_refresh_token" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Get a fresh access token and delete the event ──
  const accessToken = await getGoogleAccessToken(refreshToken);
  if (!accessToken) {
    console.warn("[skip] could not obtain access token — skipping calendar deletion");
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: "token_refresh_failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await deleteGoogleCalendarEvent(calendarEventId, accessToken);

  console.log(`[done] calendar cleanup complete for booking ${bookingId}`);
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
