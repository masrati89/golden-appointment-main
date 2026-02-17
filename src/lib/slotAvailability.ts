import {
  format,
  setHours,
  setMinutes,
  addMinutes,
  addHours,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
} from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TimeSlot {
  time: string;       // "09:00"
  datetime: Date;     // Full datetime object
  available: boolean;
  reason?: string;
}

interface BookingWithService {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string | null;
  services: { duration_min: number } | null;
}

interface SettingsForSlots {
  working_hours_start: string | null;
  working_hours_end: string | null;
  slot_duration_min: number | null;
  working_days: number[] | null;
  min_advance_hours: number | null;
}

function parseTime(timeStr: string): [number, number] {
  const [h, m] = timeStr.split(':').map(Number);
  return [h, m];
}

/** Generate all time slots for a given date */
export function generateTimeSlots(
  date: Date,
  startTime: string,
  endTime: string,
  slotDuration: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = parseTime(startTime);
  const [endH, endM] = parseTime(endTime);

  const base = startOfDay(date);
  let current = setMinutes(setHours(base, startH), startM);
  const end = setMinutes(setHours(base, endH), endM);

  while (isBefore(current, end)) {
    slots.push({
      time: format(current, 'HH:mm'),
      datetime: new Date(current),
      available: true,
    });
    current = addMinutes(current, slotDuration);
  }
  return slots;
}

/** Filter out slots where the service would finish past closing time */
export function filterSlotsWithinWorkingHours(
  slots: TimeSlot[],
  serviceDuration: number,
  endTime: string,
): TimeSlot[] {
  const [endH, endM] = parseTime(endTime);

  return slots.map((slot) => {
    const slotEnd = addMinutes(slot.datetime, serviceDuration);
    const closing = setMinutes(setHours(slot.datetime, endH), endM);

    if (isAfter(slotEnd, closing)) {
      return { ...slot, available: false, reason: 'השירות יסתיים אחרי שעות העבודה' };
    }
    return slot;
  });
}

/** Check slot availability against existing bookings */
export function checkSlotAvailability(
  slots: TimeSlot[],
  bookings: BookingWithService[],
  serviceDuration: number,
): TimeSlot[] {
  const active = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending',
  );

  return slots.map((slot) => {
    if (!slot.available) return slot;

    const slotEnd = addMinutes(slot.datetime, serviceDuration);

    for (const booking of active) {
      const bDuration = booking.services?.duration_min ?? 30;
      const [bH, bM] = parseTime(booking.booking_time);
      const bStart = setMinutes(setHours(startOfDay(slot.datetime), bH), bM);
      const bEnd = addMinutes(bStart, bDuration);

      // Overlap check
      const hasOverlap =
        (isBefore(slot.datetime, bEnd) && isAfter(slotEnd, bStart));

      if (hasOverlap) {
        return {
          ...slot,
          available: false,
          reason: `תפוס - הזמנה בשעה ${booking.booking_time}`,
        };
      }
    }
    return slot;
  });
}

/** Main function: get available slots for a date + service */
export async function getAvailableSlots(
  date: Date,
  serviceId: string,
  supabase: SupabaseClient,
): Promise<TimeSlot[]> {
  // 1. Fetch settings
  const { data: settings } = await supabase
    .from('settings')
    .select('working_hours_start, working_hours_end, slot_duration_min, working_days, min_advance_hours')
    .single();

  if (!settings) return [];
  const s = settings as SettingsForSlots;

  // 2. Working day check
  const dayOfWeek = date.getDay();
  if (!(s.working_days ?? [0, 1, 2, 3, 4]).includes(dayOfWeek)) {
    return [];
  }

  // 3. Fetch service duration
  const { data: service } = await supabase
    .from('services')
    .select('duration_min')
    .eq('id', serviceId)
    .single();

  if (!service) return [];
  const duration = service.duration_min;

  const startTime = s.working_hours_start ?? '09:00';
  const endTime = s.working_hours_end ?? '18:00';
  const slotDuration = s.slot_duration_min ?? 15;

  // 4. Generate slots
  let slots = generateTimeSlots(date, startTime, endTime, slotDuration);

  // 5. Filter by closing time
  slots = filterSlotsWithinWorkingHours(slots, duration, endTime);

  // 6. Fetch existing bookings
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_date, booking_time, status, services:service_id(duration_min)')
    .eq('booking_date', dateStr)
    .in('status', ['confirmed', 'pending']);

  // 7. Check conflicts
  slots = checkSlotAvailability(slots, (bookings ?? []) as unknown as BookingWithService[], duration);

  // 8. Fetch blocked slots for this date
  const { data: blockedSlots } = await supabase
    .from('blocked_slots')
    .select('start_time, end_time, reason')
    .eq('blocked_date', dateStr);

  // 9. Mark slots as unavailable if they fall in blocked time ranges
  if (blockedSlots && blockedSlots.length > 0) {
    slots = slots.map((slot) => {
      if (!slot.available) return slot;
      for (const block of blockedSlots) {
        const [bStartH, bStartM] = parseTime(block.start_time);
        const [bEndH, bEndM] = parseTime(block.end_time);
        const blockStart = setMinutes(setHours(startOfDay(date), bStartH), bStartM);
        const blockEnd = setMinutes(setHours(startOfDay(date), bEndH), bEndM);

        if (!isBefore(slot.datetime, blockStart) && isBefore(slot.datetime, blockEnd)) {
          return { ...slot, available: false, reason: block.reason || 'זמן חסום' };
        }
      }
      return slot;
    });
  }

  // 10. Filter past times for today
  const now = new Date();
  if (isSameDay(date, now)) {
    const minBookingTime = addHours(now, s.min_advance_hours ?? 2);
    slots = slots.map((slot) => {
      if (slot.available && isBefore(slot.datetime, minBookingTime)) {
        return { ...slot, available: false, reason: 'זמן מינימלי מראש' };
      }
      return slot;
    });
  }

  return slots;
}
