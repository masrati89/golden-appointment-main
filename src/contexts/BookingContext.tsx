import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SelectedService {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

interface BookingState {
  selectedService: SelectedService | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  customerDetails: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    notes: string;
  } | null;
}

interface BookingContextType extends BookingState {
  setSelectedService: (service: SelectedService | null) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedTime: (time: string | null) => void;
  setCustomerDetails: (details: BookingState['customerDetails']) => void;
  resetBooking: () => void;
}

const initialState: BookingState = {
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  customerDetails: null,
};

const BookingContext = createContext<BookingContextType | null>(null);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BookingState>(initialState);

  const setSelectedService = useCallback((service: SelectedService | null) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
      // Reset downstream selections when service changes
      selectedDate: null,
      selectedTime: null,
      customerDetails: null,
    }));
  }, []);

  const setSelectedDate = useCallback((date: Date | null) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedTime: null,
      customerDetails: null,
    }));
  }, []);

  const setSelectedTime = useCallback((time: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedTime: time,
      customerDetails: null,
    }));
  }, []);

  const setCustomerDetails = useCallback((details: BookingState['customerDetails']) => {
    setState((prev) => ({ ...prev, customerDetails: details }));
  }, []);

  const resetBooking = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setSelectedService,
        setSelectedDate,
        setSelectedTime,
        setCustomerDetails,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
