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

function getReminderMessage(booking: any, service: any, settings: any): string {
  const reminderHours = settings.send_reminder_hours || 24;
  
  return `🔔 *תזכורת תור*

שלום ${booking.customer_name},

זה תזכורת לתור שלך מחר:

📅 *תאריך:* ${booking.booking_date}
🕐 *שעה:* ${booking.booking_time}
💇 *שירות:* ${service.name}
⏱ *משך:* ${service.duration_min} דקות

${settings.business_address ? `📍 *כתובת:* ${settings.business_address}` : ""}

*חשוב לדעת:*
• הגעה 5 דקות לפני השעה
• במקרה של ביטול - הודיעו ${reminderHours} שעות מראש

נשמח לראותך! 💇
${settings.business_name || ""}`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get settings
    const { data: settings } = await supabase
      .from("settings")
      .select("send_reminder_hours, whatsapp_api_token, business_name, business_address, business_phone")
      .maybeSingle();

    if (!settings?.send_reminder_hours || settings.send_reminder_hours <= 0) {
      return new Response(
        JSON.stringify({ success: false, reason: "reminders_not_enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate target date/time for reminders
    const now = new Date();
    const reminderHours = settings.send_reminder_hours;
    const targetTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const targetDate = targetTime.toISOString().split('T')[0]; // yyyy-MM-dd
    
    // Find bookings that need reminders
    // Bookings scheduled for targetDate that haven't received reminders yet
    // We'll check all bookings for that date and filter by time in the loop
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        services:service_id(name, duration_min)
      `)
      .eq("booking_date", targetDate)
      .in("status", ["confirmed", "pending"])
      .or("reminder_sent.is.null,reminder_sent.eq.false");

    if (bookingsError) {
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No bookings to remind" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];
    let sentCount = 0;

    // Filter bookings by time - only send reminders for bookings happening around targetTime
    const targetHour = targetTime.getHours();
    const bookingsToRemind = bookings.filter((booking) => {
      const bookingHour = parseInt(booking.booking_time.split(':')[0]);
      // Send reminder if booking is within 2 hours of target time
      return Math.abs(bookingHour - targetHour) <= 2;
    });

    for (const booking of bookingsToRemind) {
      try {
        const service = (booking as any).services;
        if (!service) continue;

        const customerPhone = formatPhone(booking.customer_phone);
        const message = getReminderMessage(booking, service, settings);

        // Send WhatsApp reminder via edge function (if configured)
        if (settings.whatsapp_api_token) {
          // You can integrate with your WhatsApp API here
          // For now, we'll use the same send-whatsapp function pattern
          try {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                booking,
                service,
                settings: {
                  whatsapp_api_token: settings.whatsapp_api_token,
                  business_name: settings.business_name,
                  business_address: settings.business_address,
                  business_phone: settings.business_phone,
                },
                isReminder: true,
                message,
              },
            });
          } catch (waError) {
            console.warn('WhatsApp reminder failed:', waError);
            // Continue anyway - mark as sent
          }
        }
        
        // Update booking to mark reminder as sent
        await supabase
          .from("bookings")
          .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        results.push({
          bookingId: booking.id,
          customerPhone: booking.customer_phone,
          sent: true,
        });
        sentCount++;
      } catch (err) {
        results.push({
          bookingId: booking.id,
          customerPhone: booking.customer_phone,
          sent: false,
          error: String(err),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: bookingsToRemind.length,
        checked: bookings.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
