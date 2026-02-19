/**
 * Delete booking and its Google Calendar event (if exists).
 * Sequence: Delete from Google Calendar first, then from Supabase (regardless of Google result).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Get Google OAuth access token using refresh_token from business_settings.
 * Handles token refresh automatically.
 */
async function getGoogleAccessToken(refreshToken: string | null): Promise<string | null> {
  if (!refreshToken) return null;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error("Failed to refresh Google access token:", errText);
    return null;
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Delete event from Google Calendar. Returns true if deleted or 404 (already deleted), false on error.
 * Handles 401 (Unauthorized) - token may need refresh, but we proceed with DB deletion anyway.
 */
async function deleteGoogleCalendarEvent(
  eventId: string,
  accessToken: string
): Promise<boolean> {
  const calendarId = "primary";
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 404) {
    console.log(`Google Calendar event ${eventId} not found (already deleted)`);
    return true;
  }

  if (response.status === 401) {
    console.warn(`Google Calendar API returned 401 (Unauthorized) for event ${eventId} - token may need refresh`);
    return true;
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Failed to delete Google Calendar event: ${response.status} - ${errText}`);
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, google_calendar_event_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleEventId = booking.google_calendar_event_id;

    if (googleEventId) {
      const { data: businessSettings } = await supabase
        .from("business_settings")
        .select("google_calendar_refresh_token")
        .not("google_calendar_refresh_token", "is", null)
        .limit(1)
        .maybeSingle();

      const refreshToken = businessSettings?.google_calendar_refresh_token ?? null;
      if (refreshToken) {
        const accessToken = await getGoogleAccessToken(refreshToken);
        if (accessToken) {
          await deleteGoogleCalendarEvent(googleEventId, accessToken);
        } else {
          console.warn("Could not get access token for Google Calendar deletion");
        }
      } else {
        console.warn("No refresh_token in business_settings - skipping Google Calendar deletion");
      }
    }

    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking_id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Booking and Google Calendar event deleted." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
