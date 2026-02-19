/**
 * Advanced WhatsApp Automation for Beauty Salon
 * Handles automated WhatsApp notifications for new bookings with full admin control
 */

interface BookingData {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  service_name?: string;
  notes?: string | null;
}

interface WhatsAppSettings {
  whatsapp_enabled?: boolean | null;
  whatsapp_api_url?: string | null;
  whatsapp_api_token?: string | null;
  whatsapp_admin_phone?: string | null;
  whatsapp_new_booking_template?: string | null;
}

/**
 * Format phone number for international WhatsApp API
 * - Strips all non-numeric characters
 * - If starts with '0', replaces with '972' (Israel country code)
 * Example: 0501234567 -> 972501234567
 */
function formatPhoneForAPI(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 972
  if (cleaned.startsWith('0')) {
    return '972' + cleaned.substring(1);
  }
  
  // If already starts with 972, return as is
  if (cleaned.startsWith('972')) {
    return cleaned;
  }
  
  // Otherwise, assume it's already in correct format or add 972
  return cleaned.length === 9 ? '972' + cleaned : cleaned;
}

/**
 * Parse template and replace placeholders with actual booking data
 * Available variables: {{name}}, {{phone}}, {{service}}, {{date}}, {{time}}, {{price}}
 */
function parseTemplate(template: string, booking: BookingData): string {
  const dateStr = booking.booking_date;
  const timeStr = booking.booking_time;
  
  return template
    .replace(/\{\{name\}\}/g, booking.customer_name || 'לא צוין')
    .replace(/\{\{phone\}\}/g, booking.customer_phone || 'לא צוין')
    .replace(/\{\{service\}\}/g, booking.service_name || 'לא צוין')
    .replace(/\{\{date\}\}/g, dateStr || 'לא צוין')
    .replace(/\{\{time\}\}/g, timeStr || 'לא צוין')
    .replace(/\{\{date}}\s+{{time\}\}/g, `${dateStr} ${timeStr}`)
    .replace(/\{\{price\}\}/g, `₪${booking.total_price || 0}`);
}

/**
 * Send WhatsApp notification to admin for new booking
 * Non-blocking: Returns immediately, errors are logged but don't affect booking creation
 */
export async function sendWhatsAppNotification(
  booking: BookingData,
  settings: WhatsAppSettings
): Promise<void> {
  // Edge Case 1: Toggle Check
  if (!settings.whatsapp_enabled) {
    console.log('WhatsApp notifications disabled - skipping');
    return;
  }

  // Edge Case 2: Missing Credentials Check
  if (!settings.whatsapp_api_url || !settings.whatsapp_api_token || !settings.whatsapp_admin_phone) {
    console.warn('WhatsApp notification skipped: Missing API URL, Token, or Admin Phone', {
      hasUrl: !!settings.whatsapp_api_url,
      hasToken: !!settings.whatsapp_api_token,
      hasPhone: !!settings.whatsapp_admin_phone,
    });
    return;
  }

  // Format phone number
  const formattedPhone = formatPhoneForAPI(settings.whatsapp_admin_phone);

  // Get template or use default
  const template = settings.whatsapp_new_booking_template || 
    '💖 תור חדש נקבע במכון היופי!\n👤 לקוחה: {{name}}\n📱 טלפון: {{phone}}\n💅 טיפול: {{service}}\n📅 תאריך ושעה: {{date}} {{time}}';

  // Parse template
  const message = parseTemplate(template, booking);

  // Edge Case 3: Non-Blocking Execution
  // Use setTimeout to ensure this doesn't block the main thread
  setTimeout(async () => {
    try {
      const response = await fetch(settings.whatsapp_api_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.whatsapp_api_token}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
        // Set timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('WhatsApp API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return;
      }

      const result = await response.json().catch(() => ({}));
      console.log('WhatsApp notification sent successfully', result);
    } catch (error: any) {
      // Handle timeout, network errors, etc.
      if (error.name === 'AbortError') {
        console.warn('WhatsApp API request timed out after 10 seconds');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn('WhatsApp API network error:', error.message);
      } else {
        console.error('WhatsApp notification failed:', error);
      }
      // Don't throw - this is non-blocking
    }
  }, 0);
}
