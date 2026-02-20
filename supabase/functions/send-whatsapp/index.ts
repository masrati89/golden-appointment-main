/**
 * WhatsApp Notification Edge Function
 * גרסה סופית — שולפת הכל מטבלת settings לפי business_id
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function parseTemplate(template: string, booking: any, service: any): string {
  return template
    .replace(/\{\{name\}\}/g, booking.customer_name || 'לא צוין')
    .replace(/\{\{phone\}\}/g, booking.customer_phone || 'לא צוין')
    .replace(/\{\{service\}\}/g, service?.name || 'לא צוין')
    .replace(/\{\{date\}\}/g, booking.booking_date || 'לא צוין')
    .replace(/\{\{time\}\}/g, booking.booking_time || 'לא צוין')
    .replace(/\{\{price\}\}/g, `₪${booking.total_price || 0}`);
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ chatId, message }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `API returned ${response.status}: ${errorText}` };
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
    const { booking, service, business_id } = await req.json();

    if (!booking || !service) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing booking or service data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── שלוף הכל מ-settings לפי business_id ─────────────────
    let query = supabase
      .from("settings")
      .select(`
        whatsapp_enabled,
        whatsapp_api_url,
        whatsapp_api_token,
        whatsapp_admin_phone,
        whatsapp_new_booking_template,
        client_whatsapp_enabled,
        whatsapp_client_confirmation_template,
        admin_phone,
        business_name
      `);

    if (business_id) {
      query = query.eq('business_id', business_id);
      console.log(`[WhatsApp] business_id: ${business_id}`);
    } else {
      console.warn('[WhatsApp] No business_id — using first row fallback');
    }

    const { data: s, error: sError } = await query.limit(1).maybeSingle();

    if (sError) {
      console.error("Error fetching settings:", sError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!s) {
      console.error("No settings found for business_id:", business_id);
      return new Response(
        JSON.stringify({ success: false, error: "Settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // admin_phone כ-fallback אם whatsapp_admin_phone לא מוגדר
    const adminPhone = s.whatsapp_admin_phone || s.admin_phone;
    const apiToken   = s.whatsapp_api_token;
    const apiUrl     = s.whatsapp_api_url;

    const adminEnabled = s.whatsapp_enabled && apiUrl && apiToken && adminPhone;
    const clientEnabled = s.client_whatsapp_enabled && apiUrl && apiToken && booking.customer_phone;

    if (!adminEnabled && !clientEnabled) {
      console.log(`[WhatsApp] Disabled or missing credentials for business_id: ${business_id}`);
      console.log(`[WhatsApp] enabled=${s.whatsapp_enabled} url=${!!apiUrl} token=${!!apiToken} phone=${!!adminPhone}`);
      return new Response(
        JSON.stringify({ success: false, reason: "disabled_or_missing_credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── שלח הודעות במקביל ───────────────────────────────────
    const promises: Promise<{ target: string; result: { success: boolean; error?: string } }>[] = [];

    if (adminEnabled) {
      const adminChatId = formatPhoneForGreenAPI(adminPhone!);
      if (adminChatId) {
        const template = s.whatsapp_new_booking_template ||
          '💖 תור חדש נקבע!\n👤 שם: {{name}}\n📱 טלפון: {{phone}}\n💅 טיפול: {{service}}\n📅 תאריך: {{date}}\n🕐 שעה: {{time}}\n💰 מחיר: {{price}}';
        promises.push(
          sendWhatsAppMessage(apiUrl!, apiToken!, adminChatId, parseTemplate(template, booking, service))
            .then(result => ({ target: 'admin', result }))
        );
      }
    }

    if (clientEnabled) {
      const clientChatId = formatPhoneForGreenAPI(booking.customer_phone);
      if (clientChatId) {
        const template = s.whatsapp_client_confirmation_template ||
          'היי {{name}} שריינו לך את התור! 🌸\nסוג טיפול: {{service}}\nתאריך: {{date}}\nשעה: {{time}}\nמחכות לראותך!';
        promises.push(
          sendWhatsAppMessage(apiUrl!, apiToken!, clientChatId, parseTemplate(template, booking, service))
            .then(result => ({ target: 'client', result }))
            .catch(error => ({ target: 'client', result: { success: false, error: String(error) } }))
        );
      }
    }

    const results = await Promise.allSettled(promises);
    const summary: any[] = [];
    let allSuccessful = true;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { target, result: r } = result.value;
        summary.push({ target, ...r });
        if (!r.success) allSuccessful = false;
      } else {
        allSuccessful = false;
        summary.push({ target: 'unknown', success: false, error: String(result.reason) });
      }
    }

    const hasSuccess = summary.some((r: any) => r.success);
    if (hasSuccess) {
      try {
        await supabase
          .from("bookings")
          .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
      } catch (err) {
        console.warn("Failed to update whatsapp status:", err);
      }
    }

    console.log(`[WhatsApp] Summary:`, JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: allSuccessful, results: summary, business_id: business_id || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
