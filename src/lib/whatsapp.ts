import { supabase } from '@/integrations/supabase/client';

interface BookingForWA {
  id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  total_price: number;
  deposit_amount?: number | null;
  payment_method?: string | null;
  notes?: string | null;
}

interface ServiceForWA {
  name: string;
  duration_min: number;
}

interface SettingsForWA {
  business_name?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
  admin_phone?: string | null;
}

function formatPhone(phone: string): string {
  return phone.replace(/^0/, '972').replace(/-/g, '');
}

function getPaymentSummary(booking: BookingForWA): string {
  if (booking.payment_method === 'cash') {
    return `₪${booking.total_price} - תשלום במזומן במקום`;
  }
  if (booking.payment_method === 'deposit_only' && booking.deposit_amount) {
    return `מקדמה: ₪${booking.deposit_amount}\nיתרה במזומן: ₪${booking.total_price - booking.deposit_amount}`;
  }
  if (booking.payment_method === 'bank_transfer' && booking.deposit_amount) {
    return `העברה בנקאית: ₪${booking.deposit_amount}\nיתרה: ₪${booking.total_price - booking.deposit_amount}`;
  }
  if (booking.payment_method === 'bit' && booking.deposit_amount) {
    return `Bit: ₪${booking.deposit_amount}\nיתרה: ₪${booking.total_price - booking.deposit_amount}`;
  }
  return `₪${booking.total_price}`;
}

/**
 * Build WhatsApp deep link for customer confirmation.
 * Opens WhatsApp with a pre-filled message — no API token needed.
 */
export function buildCustomerWhatsAppLink(
  booking: BookingForWA,
  service: ServiceForWA,
  settings: SettingsForWA
): string {
  const phone = settings.business_phone ? formatPhone(settings.business_phone) : '';

  const message = `🎉 *אישור תור - ${service.name}*

שלום ${booking.customer_name},
התור שלך אושר בהצלחה!

📅 *תאריך:* ${booking.booking_date}
🕐 *שעה:* ${booking.booking_time}
⏱ *משך:* ${service.duration_min} דקות
${settings.business_address ? `📍 *כתובת:* ${settings.business_address}` : ''}

💰 *תשלום:*
${getPaymentSummary(booking)}

${booking.notes ? `📝 *הערות:* ${booking.notes}` : ''}

*חשוב לדעת:*
• הגעה 5 דקות לפני השעה
• במקרה של ביטול - הודיעו 24 שעות מראש

נשמח לראותך! 💇
${settings.business_name || ''}`.trim();

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp deep link for manager notification
 */
export function buildManagerWhatsAppLink(
  booking: BookingForWA,
  service: ServiceForWA,
  settings: SettingsForWA
): string {
  const adminPhone = settings.admin_phone ? formatPhone(settings.admin_phone) : '';

  const message = `📌 *תור חדש נקבע*

👤 *לקוח:* ${booking.customer_name}
📞 *טלפון:* ${booking.customer_phone}

💇 *שירות:* ${service.name}
📅 *תאריך:* ${booking.booking_date}
🕐 *שעה:* ${booking.booking_time}
⏱ *משך:* ${service.duration_min} דקות

💰 *תשלום:*
${getPaymentSummary(booking)}

${booking.notes ? `📝 *הערות לקוח:*\n${booking.notes}` : ''}

──────────────
מספר הזמנה: #${booking.id.slice(0, 8)}`.trim();

  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Send WhatsApp notification via edge function (when API token configured).
 * Falls back gracefully if not configured.
 */
export async function sendWhatsAppViaEdge(
  booking: BookingForWA,
  service: ServiceForWA,
  settings: SettingsForWA
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { booking, service, settings },
    });

    if (error) {
      console.warn('WhatsApp edge function error:', error);
      return false;
    }

    return data?.success ?? false;
  } catch (err) {
    console.warn('WhatsApp send failed:', err);
    return false;
  }
}
