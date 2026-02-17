/**
 * Utility functions for saving and restoring booking state
 * Used for seamless auth flow - save booking details before login, restore after
 */

export interface BookingState {
  serviceId: string;
  selectedDate: string; // ISO date string
  selectedTime: string;
  formData: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    notes?: string;
  };
  selectedPayment?: string;
  returnPath: string; // Original URL where booking was initiated
}

const BOOKING_STATE_KEY = 'studio_authenti_pending_booking';

/**
 * Save booking state to localStorage before redirecting to login
 */
export function saveBookingState(state: BookingState): void {
  try {
    localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save booking state:', error);
  }
}

/**
 * Get and clear booking state from localStorage
 * Returns null if no state exists
 */
export function getAndClearBookingState(): BookingState | null {
  try {
    const stored = localStorage.getItem(BOOKING_STATE_KEY);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as BookingState;
    localStorage.removeItem(BOOKING_STATE_KEY);
    return state;
  } catch (error) {
    console.error('Failed to restore booking state:', error);
    localStorage.removeItem(BOOKING_STATE_KEY);
    return null;
  }
}

/**
 * Check if there's a pending booking state
 */
export function hasPendingBookingState(): boolean {
  try {
    return !!localStorage.getItem(BOOKING_STATE_KEY);
  } catch {
    return false;
  }
}

/**
 * Clear booking state without returning it
 */
export function clearBookingState(): void {
  try {
    localStorage.removeItem(BOOKING_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear booking state:', error);
  }
}
