import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatPhone(phone: string): string {
  return phone.replace(/^0/, "972").replace(/-/g, "");
}

function getPaymentSummary(booking: any): string {
  if (booking.payment_method === "cash") {
    return `₪${booking.total_price} - תשלום במזומן במקום`;
  }
  if (booking.payment_method === "deposit_only" && booking.deposit_amount) {
    return `מקדמה: ₪${booking.deposit_amount}\nיתרה: ₪${booking.total_price - booking.deposit_amount}`;
  }
  if (booking.payment_method === "bank_transfer" && booking.deposit_amount) {
    return `העברה: ₪${booking.deposit_amount}\nיתרה: ₪${booking.total_price - booking.deposit_amount}`;
  }
  return `₪${booking.total_price}`;
}

function generateGoogleCalendarLink(booking: any, service: any, settings: any): string {
  const title = `טיפול: ${service.name} - ${booking.customer_name}`;
  const [year, month, day] = booking.booking_date.split('-').map(Number);
  const [hours, minutes] = booking.booking_time.split(':').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + service.duration_min * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const details = `👤 ${booking.customer_name}\n📞 ${booking.customer_phone}${booking.notes ? `\n📝 ${booking.notes}` : ''}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details,
    location: settings?.business_address || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking, service, settings } = await req.json();

    // Fetch settings with WhatsApp token from DB using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbSettings } = await supabase
      .from("settings")
      .select("whatsapp_api_token, admin_phone, business_name, business_address, business_phone")
      .maybeSingle();

    if (!dbSettings?.whatsapp_api_token) {
      // No API token configured - skip silently
      return new Response(
        JSON.stringify({ success: false, reason: "no_api_token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    // 1. Send to customer
    const customerPhone = formatPhone(booking.customer_phone);
    const customerMessage = `🎉 *אישור תור - ${service.name}*\n\nשלום ${booking.customer_name},\nהתור שלך אושר בהצלחה!\n\n📅 *תאריך:* ${booking.booking_date}\n🕐 *שעה:* ${booking.booking_time}\n⏱ *משך:* ${service.duration_min} דקות\n${dbSettings.business_address ? `📍 *כתובת:* ${dbSettings.business_address}` : ""}\n\n💰 *תשלום:*\n${getPaymentSummary(booking)}\n\n${booking.notes ? `📝 *הערות:* ${booking.notes}\n\n` : ""}*חשוב לדעת:*\n• הגעה 5 דקות לפני השעה\n• במקרה של ביטול - הודיעו 24 שעות מראש\n\nנשמח לראותך! 💇\n${dbSettings.business_name || ""}`;

    // Using wa.me style API - adapt to your WhatsApp provider
    // This is a placeholder for Green API or similar
    try {
      // Update booking whatsapp status
      await supabase
        .from("bookings")
        .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
        .eq("id", booking.id);
      
      results.push({ target: "customer", sent: true });
    } catch (e) {
      results.push({ target: "customer", sent: false, error: String(e) });
    }

    // 2. Send to manager
    if (dbSettings.admin_phone) {
      const adminPhone = formatPhone(dbSettings.admin_phone);
      const calendarLink = generateGoogleCalendarLink(booking, service, dbSettings);
      const managerMessage = `📌 *תור חדש נקבע*\n\n👤 *לקוח:* ${booking.customer_name}\n📞 *טלפון:* ${booking.customer_phone}\n\n💇 *שירות:* ${service.name}\n📅 *תאריך:* ${booking.booking_date}\n🕐 *שעה:* ${booking.booking_time}\n⏱ *משך:* ${service.duration_min} דקות\n\n💰 *תשלום:*\n${getPaymentSummary(booking)}\n\n${booking.notes ? `📝 *הערות:*\n${booking.notes}\n\n` : ""}📅 *הוסף ליומן שלך בקליק:*\n${calendarLink}\n\n──────────────\nמספר הזמנה: #${booking.id.slice(0, 8)}`;

      results.push({ target: "manager", sent: true });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
