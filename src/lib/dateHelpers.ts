import { format } from 'date-fns';

/**
 * Timezone-safe check: is this date in the "fully booked" list?
 * Converts dateObj to YYYY-MM-DD and checks against the array (no direct Date comparison).
 */
export function isDateFull(dateObj: Date, fullDatesArray: string[]): boolean {
  const key = format(dateObj, 'yyyy-MM-dd');
  return fullDatesArray.includes(key);
}

// Hebrew day names (short) - Sunday to Saturday
export const hebrewDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// Hebrew month names
export const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Format date in Hebrew
export const formatHebrewDate = (date: Date): string => {
  const day = format(date, 'd');
  const month = hebrewMonths[date.getMonth()];
  const year = format(date, 'yyyy');
  return `${day} ב${month} ${year}`;
};

// Get day name in Hebrew
export const getHebrewDayName = (date: Date): string => {
  return hebrewDays[date.getDay()];
};
