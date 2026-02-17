import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  booking_date: string;
  booking_time: string;
  notes?: string | null;
  service_id: string;
  google_calendar_event_id?: string | null;
}

interface Service {
  id: string;
  name: string;
  duration_min: number;
}

interface Settings {
  admin_calendar_email?: string | null;
  business_name?: string | null;
  business_address?: string | null;
  business_phone?: string | null;
}

/**
 * Create a Google Calendar event using the Calendar API
 */
async function createGoogleCalendarEvent(
  booking: Booking,
  service: Service,
  settings: Settings,
  accessToken: string
): Promise<{ eventId: string; htmlLink: string }> {
  const adminEmail = settings.admin_calendar_email;
  if (!adminEmail) {
    throw new Error("admin_calendar_email not configured");
  }

  // Parse date and time (stored as Israel local)
  const [year, month, day] = booking.booking_date.split("-").map(Number);
  const [h, m] = booking.booking_time.split(":").map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;

  // Build RFC3339 in Israel timezone (+02:00)
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${booking.booking_date}T${pad(hours)}:${pad(minutes)}:00+02:00`;
  const totalEndMin = hours * 60 + minutes + service.duration_min;
  const endH = Math.floor(totalEndMin / 60) % 24;
  const endM = totalEndMin % 60;
  const endStr = `${booking.booking_date}T${pad(endH)}:${pad(endM)}:00+02:00`;

  const event = {
    summary: `${booking.customer_name} - ${service.name}`,
    description: [
      `👤 לקוח: ${booking.customer_name}`,
      `📞 טלפון: ${booking.customer_phone}`,
      booking.customer_email ? `📧 אימייל: ${booking.customer_email}` : "",
      booking.notes ? `📝 הערות: ${booking.notes}` : "",
      "",
      `🔗 לוח בקרה: ${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/admin/bookings`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: startStr,
      timeZone: "Asia/Jerusalem",
    },
    end: {
      dateTime: endStr,
      timeZone: "Asia/Jerusalem",
    },
    location: settings.business_address || undefined,
    attendees: adminEmail ? [{ email: adminEmail }] : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 24 hours before
        { method: "popup", minutes: 60 }, // 1 hour before
      ],
    },
  };

  // Insert into the admin's calendar (they must share it with the service account email)
  const calendarId = encodeURIComponent(adminEmail);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}

/**
 * Get Google OAuth access token: prefers refresh_token from settings (OAuth flow),
 * then env GOOGLE_REFRESH_TOKEN, then service account.
 */
async function getGoogleAccessToken(refreshTokenFromSettings?: string | null): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  // Option 1: Use refresh token from settings (one-click OAuth for this business)
  const refreshToken = refreshTokenFromSettings ?? Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (refreshToken && clientId && clientSecret) {
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

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    }
    // If we had refreshTokenFromSettings and it failed, don't fall back silently
    if (refreshTokenFromSettings) {
      const err = await tokenResponse.text();
      throw new Error(`Failed to refresh Google access token: ${err}`);
    }
  }

  // Option 2: Use service account (server-to-server)
  const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (serviceAccountEmail && serviceAccountKey) {
    const jwt = await createServiceAccountJWT(serviceAccountEmail, serviceAccountKey);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token from service account");
    }
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  throw new Error("No Google authentication method configured (connect Google Calendar in Settings or set Service Account secrets)");
}

/**
 * Create JWT for Google Service Account authentication (RS256).
 * Credentials come from Supabase Secrets (from your JSON key file).
 */
async function createServiceAccountJWT(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("https://deno.land/x/jose@4.14.4/index.ts");

  // Supabase Secrets may store the key with literal \n; normalize to real newlines
  const pem = privateKeyPem.replace(/\\n/g, "\n").trim();
  const key = await importPKCS8(pem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/calendar" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  return jwt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get booking data from webhook payload
    const payload = await req.json();
    const bookingId = payload.record?.id || payload.booking_id;

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking with service details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services:service_id (
          id,
          name,
          duration_min
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: "unknown",
        status: "error",
        error_message: `Booking not found: ${bookingError?.message}`,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const service = booking.services as Service;
    if (!service) {
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: "unknown",
        status: "error",
        error_message: "Service not found",
      });

      return new Response(
        JSON.stringify({ success: false, error: "Service not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Settings for calendar target; refresh_token from business_settings (OAuth, per business)
    const { data: settings } = await supabase
      .from("settings")
      .select("id, admin_calendar_email, business_name, business_address, business_phone")
      .maybeSingle();

    const { data: businessSettings } = settings?.id
      ? await supabase
          .from("business_settings")
          .select("google_calendar_refresh_token")
          .eq("settings_id", settings.id)
          .maybeSingle()
      : await supabase
          .from("business_settings")
          .select("google_calendar_refresh_token")
          .maybeSingle();

    const refreshToken = businessSettings?.google_calendar_refresh_token ?? null;

    if (!settings?.admin_calendar_email) {
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: "not_configured",
        status: "skipped",
        error_message: "admin_calendar_email not configured in settings",
      });

      return new Response(
        JSON.stringify({ success: false, reason: "admin_calendar_email not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already synced
    if (booking.google_calendar_event_id) {
      return new Response(
        JSON.stringify({ success: true, reason: "already_synced", event_id: booking.google_calendar_event_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google access token (refresh_token from business_settings; keys from Supabase Secrets)
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(refreshToken);
    } catch (error) {
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: settings.admin_calendar_email,
        status: "error",
        error_message: `Failed to get access token: ${error.message}`,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to authenticate with Google" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create calendar event
    try {
      const { eventId, htmlLink } = await createGoogleCalendarEvent(
        booking as Booking,
        service,
        settings,
        accessToken
      );

      // Update booking with event ID
      await supabase
        .from("bookings")
        .update({ google_calendar_event_id: eventId })
        .eq("id", bookingId);

      // Log success
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: settings.admin_calendar_email,
        status: "success",
        google_event_id: eventId,
        details: { htmlLink },
      });

      return new Response(
        JSON.stringify({ success: true, event_id: eventId, html_link: htmlLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      // Log error but don't fail the booking
      await supabase.from("calendar_sync_logs").insert({
        booking_id: bookingId,
        admin_email: settings.admin_calendar_email,
        status: "error",
        error_message: error.message,
        details: { error: String(error) },
      });

      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
