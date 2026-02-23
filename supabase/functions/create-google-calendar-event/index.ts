/**
 * Create Google Calendar event for a booking and save the event ID.
 * Uses OAuth refresh_token from business_settings to authenticate.
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
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return null;
  }

  try {
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
  } catch (error) {
    console.error("Error refreshing Google access token:", error);
    return null;
  }
}

/**
 * Create event in Google Calendar. Returns event ID on success, null on error.
 * Handles 401 (Unauthorized) by attempting token refresh once.
 */
async function createGoogleCalendarEvent(
  accessToken: string,
  params: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
  }
): Promise<{ eventId: string | null; needsRetry: boolean }> {
  const calendarId = "primary";
  
  const eventBody = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startDateTime,
      timeZone: "Asia/Jerusalem",
    },
    end: {
      dateTime: params.endDateTime,
      timeZone: "Asia/Jerusalem",
    },
  };

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (response.status === 401) {
      console.warn("Google Calendar API returned 401 (Unauthorized) - token may need refresh");
      return { eventId: null, needsRetry: true };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Failed to create Google Calendar event: ${response.status} - ${errText}`);
      return { eventId: null, needsRetry: false };
    }

    const eventData = await response.json();
    return { eventId: eventData.id || null, needsRetry: false };
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    return { eventId: null, needsRetry: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
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
    } = body;

    if (!booking_id || !customer_name || !booking_date || !booking_time || !service_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Resolve the business_id that owns this booking.
    // We look it up from the bookings table using the booking_id supplied by the caller.
    // This is the only safe way to ensure we always fetch the correct tenant's credentials —
    // never rely on a .limit(1) query without a business_id filter.
    const { data: bookingRow, error: bookingLookupError } = await supabase
      .from("bookings")
      .select("business_id")
      .eq("id", booking_id)
      .single();

    if (bookingLookupError || !bookingRow?.business_id) {
      console.error("Failed to resolve business_id from booking:", bookingLookupError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Could not resolve business for this booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedBusinessId = bookingRow.business_id;
    console.log(`[GoogleCalendar] Resolved business_id: ${resolvedBusinessId} for booking: ${booking_id}`);

    // Step 2: Fetch Google Calendar credentials from the correct tenant's settings row.
    // Uses the `settings` table (single source of truth for all business config).
    const { data: businessSettings, error: settingsError } = await supabase
      .from("settings")
      .select("google_calendar_refresh_token, google_calendar_connected")
      .eq("business_id", resolvedBusinessId)
      .maybeSingle();

    if (settingsError || !businessSettings?.google_calendar_refresh_token) {
      console.log(`[GoogleCalendar] No refresh_token found for business_id: ${resolvedBusinessId}`);
      return new Response(
        JSON.stringify({ success: false, error: "Google Calendar not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!businessSettings.google_calendar_connected) {
      console.log(`[GoogleCalendar] Calendar not enabled for business_id: ${resolvedBusinessId}`);
      return new Response(
        JSON.stringify({ success: false, error: "Google Calendar not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refreshToken = businessSettings.google_calendar_refresh_token;

    // Get access token
    let accessToken = await getGoogleAccessToken(refreshToken);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get Google access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date and time for Google Calendar (Israel timezone)
    // booking_date format: YYYY-MM-DD, booking_time format: HH:MM
    // Create ISO 8601 datetime string in Israel timezone (Asia/Jerusalem)
    // Note: Google Calendar API accepts ISO strings with timezone, and will convert based on timeZone field
    const startDateTimeISO = `${booking_date}T${booking_time}:00+03:00`; // Israel standard time (UTC+3)
    const startDate = new Date(startDateTimeISO);
    const endDate = new Date(startDate.getTime() + (service_duration_min || 60) * 60 * 1000);
    
    // Format as ISO strings for Google Calendar API
    const startDateTimeFormatted = startDate.toISOString();
    const endDateTimeFormatted = endDate.toISOString();

    // Build event summary and description
    const summary = `${customer_name} - ${service_name}`;
    const descriptionParts = [`טלפון: ${customer_phone}`];
    if (customer_email) {
      descriptionParts.push(`אימייל: ${customer_email}`);
    }
    if (notes) {
      descriptionParts.push(`הערות: ${notes}`);
    }
    const description = descriptionParts.join("\n");

    // Create event in Google Calendar
    let result = await createGoogleCalendarEvent(accessToken, {
      summary,
      description,
      startDateTime: startDateTimeFormatted,
      endDateTime: endDateTimeFormatted,
    });

    // If 401, retry once with refreshed token
    if (result.needsRetry) {
      console.log("Retrying with refreshed token...");
      accessToken = await getGoogleAccessToken(refreshToken);
      if (accessToken) {
        result = await createGoogleCalendarEvent(accessToken, {
          summary,
          description,
          startDateTime: startDateTimeFormatted,
          endDateTime: endDateTimeFormatted,
        });
      }
    }

    if (!result.eventId) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create Google Calendar event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking with Google Calendar event ID
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ google_calendar_event_id: result.eventId })
      .eq("id", booking_id);

    if (updateError) {
      console.error("Failed to update booking with event ID:", updateError);
      // Still return success since event was created
    }

    return new Response(
      JSON.stringify({ success: true, event_id: result.eventId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-google-calendar-event:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
