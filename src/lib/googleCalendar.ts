import { supabase } from '@/integrations/supabase/client';

interface CreateCalendarEventParams {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  booking_date: string;
  booking_time: string;
  service_name: string;
  service_duration_min: number;
  notes?: string | null;
}

/**
 * Create Google Calendar event for a booking and save the event ID.
 * Uses Edge Function to handle OAuth token refresh and API call.
 */
export async function createGoogleCalendarEvent(params: CreateCalendarEventParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-to-google-calendar', {
      body: {
        booking_id: params.booking_id,
        customer_name: params.customer_name,
        customer_phone: params.customer_phone,
        customer_email: params.customer_email,
        booking_date: params.booking_date,
        booking_time: params.booking_time,
        service_name: params.service_name,
        service_duration_min: params.service_duration_min,
        notes: params.notes,
      },
    });

    if (error) {
      console.error('Failed to create Google Calendar event:', error);
      return null;
    }

    if (data?.success && data?.event_id) {
      return data.event_id;
    }

    return null;
  } catch (e) {
    console.error('Error creating Google Calendar event:', e);
    return null;
  }
}
