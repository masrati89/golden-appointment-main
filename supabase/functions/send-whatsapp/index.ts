/**
 * WhatsApp Notification Edge Function
 * Sends automated WhatsApp notifications for new bookings:
 * - Admin notifications (if whatsapp_enabled = true)
 * - Client confirmations (if client_whatsapp_enabled = true)
 * Uses admin-configured templates and handles both concurrently
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Format phone number for Green API chatId.
 * - Remove all non-numeric characters (spaces, dashes, plus signs).
 * - If the cleaned number starts with "0", replace the leading "0" with "972".
 * - If it already starts with "972", leave the prefix as is.
 * - Green API requirement: append @c.us to the end.
 * Example: 054-123-4567 → 972541234567@c.us
 */
function formatPhoneForGreenAPI(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned.length) return '';
  let normalized: string;
  if (cleaned.startsWith('0')) {
    normalized = '972' + cleaned.substring(1);
  } else if (cleaned.startsWith('972')) {
    normalized = cleaned;
  } else if (cleaned.length === 9) {
    normalized = '972' + cleaned;
  } else {
    normalized = cleaned;
  }
  return normalized + '@c.us';
}

/**
 * Parse template and replace placeholders with actual booking data
 */
function parseTemplate(template: string, booking: any, service: any): string {
  return template
    .replace(/\{\{name\}\}/g, booking.customer_name || 'לא צוין')
    .replace(/\{\{phone\}\}/g, booking.customer_phone || 'לא צוין')
    .replace(/\{\{service\}\}/g, service?.name || 'לא צוין')
    .replace(/\{\{date\}\}/g, booking.booking_date || 'לא צוין')
    .replace(/\{\{time\}\}/g, booking.booking_time || 'לא צוין')
    .replace(/\{\{date}}\s+{{time\}\}/g, `${booking.booking_date} ${booking.booking_time}`)
    .replace(/\{\{price\}\}/g, `₪${booking.total_price || 0}`);
}

/**
 * Send WhatsApp message via Green API
 * Payload uses chatId (e.g. 972541234567@c.us), not phone
 */
async function sendWhatsAppMessage(
  apiUrl: string,
  apiToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        chatId: chatId,
        message: message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    await response.json().catch(() => ({}));
    return { success: true };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out after 10 seconds' };
    }
    return { success: false, error: String(error) };
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
    const { booking, service } = await req.json();

    if (!booking || !service) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing booking or service data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch WhatsApp settings from business_settings
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from("business_settings")
      .select(`
        whatsapp_enabled,
        whatsapp_api_url,
        whatsapp_api_token,
        whatsapp_admin_phone,
        whatsapp_new_booking_template,
        client_whatsapp_enabled,
        whatsapp_client_confirmation_template
      `)
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching WhatsApp settings:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any WhatsApp feature is enabled
    const adminEnabled = whatsappSettings?.whatsapp_enabled && 
                         whatsappSettings?.whatsapp_api_url && 
                         whatsappSettings?.whatsapp_api_token && 
                         whatsappSettings?.whatsapp_admin_phone;

    const clientEnabled = whatsappSettings?.client_whatsapp_enabled && 
                          whatsappSettings?.whatsapp_api_url && 
                          whatsappSettings?.whatsapp_api_token && 
                          booking.customer_phone;

    if (!adminEnabled && !clientEnabled) {
      console.log("WhatsApp notifications disabled or missing credentials - skipping");
      return new Response(
        JSON.stringify({ success: false, reason: "disabled_or_missing_credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare promises for concurrent execution
    const promises: Promise<{ target: string; result: { success: boolean; error?: string } }>[] = [];

    // Admin notification (if enabled)
    if (adminEnabled) {
      const adminChatId = formatPhoneForGreenAPI(whatsappSettings.whatsapp_admin_phone);
      if (adminChatId) {
        const adminTemplate = whatsappSettings.whatsapp_new_booking_template || 
          '💖 תור חדש נקבע במכון היופי!\n👤 לקוחה: {{name}}\n📱 טלפון: {{phone}}\n💅 טיפול: {{service}}\n📅 תאריך ושעה: {{date}} {{time}}';
        const adminMessage = parseTemplate(adminTemplate, booking, service);

        promises.push(
          sendWhatsAppMessage(
            whatsappSettings.whatsapp_api_url,
            whatsappSettings.whatsapp_api_token,
            adminChatId,
            adminMessage
          ).then(result => ({ target: 'admin', result }))
        );
      }
    }

    // Client confirmation (if enabled)
    if (clientEnabled) {
      const clientChatId = formatPhoneForGreenAPI(booking.customer_phone);
      const clientTemplate = whatsappSettings.whatsapp_client_confirmation_template || 
        'היי {{name}} שריינו לך את התור! 🌸\nסוג טיפול: {{service}}\nמתי? {{date}}\nמחכות לראותך!';
      const clientMessage = parseTemplate(clientTemplate, booking, service);

      if (clientChatId) {
        promises.push(
          sendWhatsAppMessage(
            whatsappSettings.whatsapp_api_url,
            whatsappSettings.whatsapp_api_token,
            clientChatId,
            clientMessage
          ).then(result => ({ target: 'client', result }))
          .catch(error => {
            // Resilience: Log client notification errors but don't fail the booking
            console.warn("Client WhatsApp notification failed (non-blocking):", error);
            return { target: 'client', result: { success: false, error: String(error) } };
          })
        );
      }
    }

    // Execute both notifications concurrently using Promise.allSettled
    // This ensures one failing doesn't block the other
    const results = await Promise.allSettled(promises);

    const summary: any[] = [];
    let allSuccessful = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { target, result: sendResult } = result.value;
        summary.push({ target, ...sendResult });
        if (!sendResult.success) {
          allSuccessful = false;
        }
      } else {
        allSuccessful = false;
        summary.push({ target: 'unknown', success: false, error: String(result.reason) });
      }
    }

    // Update booking whatsapp status if at least one notification succeeded
    const hasSuccess = summary.some((r: any) => r.success);
    if (hasSuccess) {
      await supabase
        .from("bookings")
        .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
        .eq("id", booking.id)
        .catch((err) => console.warn("Failed to update booking WhatsApp status:", err));
    }

    // Log results for debugging
    console.log("WhatsApp notifications summary:", summary);

    return new Response(
      JSON.stringify({ 
        success: allSuccessful, 
        results: summary,
        message: hasSuccess ? "Notifications sent" : "Some notifications failed"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    // Non-blocking: Return success even if there's an error
    // The booking was already saved, so we don't want to fail here
    return new Response(
      JSON.stringify({ success: false, error: String(error), nonBlocking: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
