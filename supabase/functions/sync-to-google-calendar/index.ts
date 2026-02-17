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

  // Parse date and time
  const [year, month, day] = booking.booking_date.split("-").map(Number);
  const [hours, minutes] = booking.booking_time.split(":").map(Number);

  // Create dates in Israel timezone (UTC+2/+3)
  // Note: Adjust timezone handling based on your needs
  const startDate = new Date(Date.UTC(year, month - 1, day, hours - 2, minutes));
  const endDate = new Date(startDate.getTime() + service.duration_min * 60 * 1000);

  // Format for Google Calendar API (RFC3339)
  const formatRFC3339 = (date: Date): string => {
    return date.toISOString();
  };

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
      dateTime: formatRFC3339(startDate),
      timeZone: "Asia/Jerusalem",
    },
    end: {
      dateTime: formatRFC3339(endDate),
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

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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
 * Get Google OAuth access token using service account or OAuth2
 * Note: This requires proper OAuth setup. For production, use service account or stored refresh token.
 */
async function getGoogleAccessToken(): Promise<string> {
  // Option 1: Use service account (recommended for server-to-server)
  const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (serviceAccountEmail && serviceAccountKey) {
    // Create JWT for service account
    const jwt = await createServiceAccountJWT(serviceAccountEmail, serviceAccountKey);
    
    // Exchange JWT for access token
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

  // Option 2: Use stored refresh token (if available)
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (refreshToken) {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

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
      throw new Error("Failed to refresh access token");
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  throw new Error("No Google authentication method configured");
}

/**
 * Create JWT for service account authentication
 * Using jose library for proper JWT signing
 */
async function createServiceAccountJWT(
  email: string,
  privateKey: string
): Promise<string> {
  try {
    // Import jose library dynamically
    const { SignJWT } = await import("https://deno.land/x/jose@v4.14.4/index.ts");
    const { parsePKCS8 } = await import("https://deno.land/x/jose@v4.14.4/index.ts");
    
    const now = Math.floor(Date.now() / 1000);
    const key = await parsePKCS8(privateKey);
    
    const jwt = await new SignJWT({
      scope: "https://www.googleapis.com/auth/calendar",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt(now)
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setExpirationTime(now + 3600)
      .sign(key);
    
    return jwt;
  } catch (error) {
    // Fallback: If jose is not available, use refresh token method
    console.error("JWT creation failed, falling back to refresh token:", error);
    throw new Error("Service account JWT creation failed - ensure jose library is available or use refresh token");
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

    // Fetch settings to get admin_calendar_email
    const { data: settings } = await supabase
      .from("settings")
      .select("admin_calendar_email, business_name, business_address, business_phone")
      .maybeSingle();

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

    // Get Google access token
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken();
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
