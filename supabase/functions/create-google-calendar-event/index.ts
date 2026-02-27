/**
 * create-google-calendar-event — Create a Google Calendar event for a new booking.
 * ─────────────────────────────────────────────────────────────────────────────
 * Called from BookingVertical.tsx (and BookingWizard.tsx) immediately after a
 * booking is inserted.  The call is fire-and-forget from the frontend so this
 * function MUST never block the booking confirmation flow.
 *
 * Auth: Accepts a valid Supabase user JWT (sent automatically by
 *       supabase.functions.invoke) OR the service_role key.
 *
 * Deploy:
 *   npx supabase functions deploy create-google-calendar-event
 *
 * Required secrets (set once per project, shared across all functions):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId     = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.error("[token] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return null;
  }

  console.log("[token] refreshing Google access token...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[token] token refresh failed:", res.status, err);
    return null;
  }

  const data = await res.json();
  if (!data.access_token) {
    console.error("[token] no access_token in response:", JSON.stringify(data));
    return null;
  }
  console.log("[token] access token refreshed OK");
  return data.access_token;
}

/** Returns eventId on success, null on error.  needsRetry=true on 401. */
async function postCalendarEvent(
  accessToken: string,
  event: { summary: string; description: string; startDateTime: string; endDateTime: string }
): Promise<{ eventId: string | null; needsRetry: boolean }> {
  const body = {
    summary:     event.summary,
    description: event.description,
    start: { dateTime: event.startDateTime, timeZone: "Asia/Jerusalem" },
    end:   { dateTime: event.endDateTime,   timeZone: "Asia/Jerusalem" },
  };

  console.log("[calendar] POST event:", event.summary, event.startDateTime, "→", event.endDateTime);

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    }
  );

  if (res.status === 401) {
    console.warn("[calendar] 401 Unauthorized — will retry with fresh token");
    return { eventId: null, needsRetry: true };
  }

  if (!res.ok) {
    const err = await res.text();
    console.error("[calendar] API error:", res.status, err);
    return { eventId: null, needsRetry: false };
  }

  const data = await res.json();
  console.log("[calendar] event created, id:", data.id);
  return { eventId: data.id ?? null, needsRetry: false };
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  // ── Auth: service_role key OR valid user JWT ──────────────────────────────
  const authHeader = req.headers.get("Authorization");
  const token      = authHeader?.replace("Bearer ", "");
  if (!token) {
    console.error("[auth] missing Authorization header");
    return json({ success: false, error: "Authorization required" }, 401);
  }

  if (token !== serviceKey) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      console.error("[auth] JWT validation failed:", authErr?.message);
      return json({ success: false, error: "Unauthorized" }, 401);
    }
    console.log("[auth] authenticated as user:", user.id.slice(0, 8) + "...");
  } else {
    console.log("[auth] service_role key accepted");
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const {
    booking_id,
    customer_name,
    customer_phone,
    customer_email,
    booking_date,
    booking_time,
    service_name,
    service_duration_min,
    notes,
  } = body as Record<string, unknown>;

  console.log(`[start] booking_id=${booking_id} date=${booking_date} time=${booking_time} service="${service_name}"`);

  if (!booking_id || !customer_name || !booking_date || !booking_time || !service_name) {
    return json({ success: false, error: "Missing required fields" }, 400);
  }

  // ── Resolve business_id from the booking row ──────────────────────────────
  // Never trust the caller to supply business_id — derive it from the DB.
  const { data: bookingRow, error: bookingErr } = await supabase
    .from("bookings")
    .select("business_id")
    .eq("id", booking_id)
    .single();

  if (bookingErr || !bookingRow?.business_id) {
    console.error("[lookup] failed to resolve business_id:", bookingErr?.message);
    return json({ success: false, error: "Could not resolve business for this booking" }, 400);
  }

  const businessId = bookingRow.business_id;
  console.log("[lookup] business_id:", businessId);

  // ── Fetch calendar credentials (tenant-scoped) ────────────────────────────
  const { data: settings, error: settingsErr } = await supabase
    .from("settings")
    .select("google_calendar_refresh_token, google_calendar_connected")
    .eq("business_id", businessId)
    .maybeSingle();

  if (settingsErr) {
    console.error("[settings] DB error:", settingsErr.message, settingsErr.code);
    return json({ success: false, error: "Failed to load calendar settings" }, 500);
  }

  if (!settings) {
    console.log("[settings] no settings row found for business_id:", businessId);
    return json({ success: false, error: "Business settings not found" }, 400);
  }

  if (!settings.google_calendar_connected) {
    console.log("[settings] google_calendar_connected = false — skipping");
    return json({ success: false, error: "Google Calendar not connected" }, 400);
  }

  const refreshToken = settings.google_calendar_refresh_token;
  if (!refreshToken) {
    console.log("[settings] refresh_token is null — skipping");
    return json({ success: false, error: "Google Calendar not connected" }, 400);
  }
  console.log("[settings] refresh_token found (", refreshToken.slice(0, 8) + "...)");

  // ── Build datetime strings ────────────────────────────────────────────────
  // IMPORTANT: Send LOCAL datetime strings WITHOUT a timezone offset.
  // Google Calendar interprets the dateTime in the context of the timeZone field.
  // Sending a UTC-offset string (e.g. +03:00) hardcodes the UTC moment, which
  // is wrong during Israel Standard Time (UTC+2, winter months).
  const durationMin = Number(service_duration_min) || 60;
  const [hStr, mStr] = String(booking_time).split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const endTotalMin = h * 60 + m + durationMin;
  const endH = String(Math.floor(endTotalMin / 60) % 24).padStart(2, "0");
  const endM = String(endTotalMin % 60).padStart(2, "0");

  // Handle rare midnight rollover (service running past 23:59)
  let endDateStr = String(booking_date);
  if (endTotalMin >= 24 * 60) {
    const d = new Date(String(booking_date) + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    endDateStr = d.toISOString().slice(0, 10);
  }

  const startDateTimeFormatted = `${booking_date}T${booking_time}:00`;
  const endDateTimeFormatted   = `${endDateStr}T${endH}:${endM}:00`;

  // ── Build event payload ───────────────────────────────────────────────────
  const summary = `${customer_name} - ${service_name}`;
  const descParts: string[] = [`טלפון: ${customer_phone}`];
  if (customer_email) descParts.push(`אימייל: ${customer_email}`);
  if (notes)          descParts.push(`הערות: ${notes}`);
  const description = descParts.join("\n");

  // ── Get access token ──────────────────────────────────────────────────────
  let accessToken = await getGoogleAccessToken(refreshToken);
  if (!accessToken) {
    return json({ success: false, error: "Failed to obtain Google access token" }, 500);
  }

  // ── Create calendar event (retry once on 401) ─────────────────────────────
  let result = await postCalendarEvent(accessToken, {
    summary,
    description,
    startDateTime: startDateTimeFormatted,
    endDateTime:   endDateTimeFormatted,
  });

  if (result.needsRetry) {
    console.log("[calendar] retrying with fresh token...");
    accessToken = await getGoogleAccessToken(refreshToken) ?? accessToken;
    result = await postCalendarEvent(accessToken, {
      summary,
      description,
      startDateTime: startDateTimeFormatted,
      endDateTime:   endDateTimeFormatted,
    });
  }

  if (!result.eventId) {
    return json({ success: false, error: "Failed to create Google Calendar event" }, 500);
  }

  // ── Save event ID on the booking ─────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ google_calendar_event_id: result.eventId })
    .eq("id", booking_id);

  if (updateErr) {
    // Event was created in Google Calendar — log but don't fail
    console.error("[save] failed to write google_calendar_event_id:", updateErr.message);
  } else {
    console.log("[save] booking updated with event_id:", result.eventId);
  }

  console.log(`[done] booking ${booking_id} → calendar event ${result.eventId}`);
  return json({ success: true, event_id: result.eventId });
});
