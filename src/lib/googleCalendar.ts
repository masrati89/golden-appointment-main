/**
 * Generate a Google Calendar deep link for a booking.
 */
export function generateGoogleCalendarLink(
  booking: {
    booking_date: string; // yyyy-MM-dd
    booking_time: string; // HH:mm
    customer_name: string;
    customer_phone: string;
    notes?: string | null;
  },
  service: { name: string; duration_min: number },
  settings: {
    business_name?: string | null;
    business_address?: string | null;
  }
): string {
  const title = `טיפול: ${service.name} - ${booking.customer_name}`;

  // Parse date/time to UTC (assuming Israel time UTC+2/+3, using +02:00 as default)
  const [year, month, day] = booking.booking_date.split('-').map(Number);
  const [hours, minutes] = booking.booking_time.split(':').map(Number);

  // Create date in local time, then format as UTC
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + service.duration_min * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const details = [
    `👤 לקוח: ${booking.customer_name}`,
    `📞 טלפון: ${booking.customer_phone}`,
    booking.notes ? `📝 הערות: ${booking.notes}` : '',
    '',
    settings.business_name || '',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details,
    location: settings.business_address || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
