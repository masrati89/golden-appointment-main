import { format, addMinutes, parseISO } from 'date-fns';

interface BookingForCalendar {
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_email?: string | null;
  notes?: string | null;
  total_price: number;
  deposit_amount?: number | null;
  payment_method?: string | null;
}

interface ServiceForCalendar {
  name: string;
  duration_min: number;
}

interface SettingsForCalendar {
  business_name?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatICSDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Generate .ics calendar content for a booking.
 * Works with ALL calendar apps (iPhone, Android, Outlook, etc.)
 */
export function generateICSContent(
  booking: BookingForCalendar,
  service: ServiceForCalendar,
  settings: SettingsForCalendar
): string {
  const startDateTime = parseISO(`${booking.booking_date}T${booking.booking_time}`);
  const endDateTime = addMinutes(startDateTime, service.duration_min);

  const title = `${service.name} - ${settings.business_name || 'תור'}`;

  let description = `טיפול: ${service.name}\nמחיר: ₪${booking.total_price}`;
  if (booking.payment_method === 'deposit_only' && booking.deposit_amount) {
    description += `\nמקדמה: ₪${booking.deposit_amount}\nיתרה: ₪${booking.total_price - booking.deposit_amount}`;
  }
  if (settings.business_phone) {
    description += `\nטלפון: ${settings.business_phone}`;
  }
  if (booking.notes) {
    description += `\nהערות: ${booking.notes}`;
  }

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@booking`;
  const now = formatICSDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Booking App//ICS//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    ...(settings.business_address ? [`LOCATION:${escapeICS(settings.business_address)}`] : []),
    'STATUS:CONFIRMED',
    // 24h reminder
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת לתור',
    'END:VALARM',
    // 1h reminder
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת - עוד שעה',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Download .ics file to user's device
 */
export function downloadICSFile(
  booking: BookingForCalendar,
  service: ServiceForCalendar,
  settings: SettingsForCalendar
): void {
  const icsContent = generateICSContent(booking, service, settings);

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${booking.booking_date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
