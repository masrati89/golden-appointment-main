import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Clock, Tag, Calendar, ArrowRight } from 'lucide-react';

import Layout from '@/components/Layout';
import DatePicker from '@/components/DatePicker';
import { DatePickerSkeleton } from '@/components/DatePickerSkeleton';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import { useAvailabilityCounts } from '@/hooks/useAvailabilityCounts';
import BookingForm from '@/components/BookingForm';
import BookingConfirmation from '@/components/BookingConfirmation';
import { useSettings } from '@/hooks/useSettings';
import { getAvailableSlots } from '@/lib/slotAvailability';
import { useBusinessSafe } from '@/contexts/BusinessContext';
import { formatHebrewDate } from '@/lib/dateHelpers';
import type { BookingFormData } from '@/lib/validations';

const BookService = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: settings } = useSettings();
  const { businessId } = useBusinessSafe();

  const timeSlotRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to time slots after date selection
  useEffect(() => {
    if (selectedDate && timeSlotRef.current) {
      const timeout = setTimeout(() => {
        timeSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [selectedDate]);

  // Auto-scroll to form after time selection (no auto-focus)
  useEffect(() => {
    if (selectedTime && formRef.current) {
      const timeout = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [selectedTime]);

  // Fetch service details
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  // Fetch slots when date selected
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', serviceId, selectedDate?.toISOString()],
    queryFn: () => getAvailableSlots(selectedDate!, serviceId!, supabase, businessId),
    enabled: !!selectedDate && !!serviceId,
  });

  // Non-working days from settings
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4];
  const disabledDays = allDays.filter((d) => !workingDays.includes(d));

  const calendarStart = startOfMonth(selectedDate ?? new Date());
  const calendarEnd = endOfMonth(addDays(calendarStart, 60));
  const { data: availabilityCounts, isLoading: availabilityLoading } = useAvailabilityCounts(
    serviceId ?? null,
    calendarStart,
    calendarEnd,
    businessId,
  );

  // Create booking (Phase 2 logic intact)
  const createBooking = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      const dateStr = format(selectedDate!, 'yyyy-MM-dd');
      const { data: conflict } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', dateStr)
        .eq('booking_time', selectedTime!)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle();

      if (conflict) {
        throw new Error('השעה נתפסה, אנא בחר שעה אחרת');
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          service_id: serviceId!,
          booking_date: dateStr,
          booking_time: selectedTime!,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail || null,
          notes: formData.notes || null,
          total_price: Number(service!.price),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create Google Calendar event (non-blocking)
      if (settings?.google_calendar_connected) {
        supabase.functions.invoke('create-google-calendar-event', {
          body: {
            booking_id: data.id,
            customer_name: formData.customerName,
            customer_phone: formData.customerPhone,
            customer_email: formData.customerEmail || null,
            booking_date: dateStr,
            booking_time: selectedTime!,
            service_name: service!.name,
            service_duration_min: service!.duration_min,
            notes: formData.notes || null,
          },
        }).catch((err) => {
          console.error('Failed to create Google Calendar event:', err);
        });
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      setConfirmedName(variables.customerName);
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['availability-counts'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (serviceLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 animate-pulse space-y-6">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-96 bg-muted rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!service) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-destructive text-lg">השירות לא נמצא</p>
          <button onClick={() => navigate('/')} className="text-gold mt-4 font-semibold">
            חזרה לדף הבית
          </button>
        </div>
      </Layout>
    );
  }

  if (showConfirmation && selectedDate && selectedTime) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 animate-fade-in">
          <BookingConfirmation
            serviceName={service.name}
            servicePrice={Number(service.price)}
            bookingDate={selectedDate}
            bookingTime={selectedTime}
            customerName={confirmedName}
            onGoHome={() => navigate('/')}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 md:py-8 space-y-8 animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="text-gold flex items-center gap-1.5 font-medium hover:underline text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לשירותים
        </button>

        {/* Service Summary Card */}
        <div className="bg-gradient-to-br from-gold/10 to-gold/5 border-2 border-gold/20 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">{service.name}</h2>
              {service.description && (
                <p className="text-muted-foreground text-sm mb-3">{service.description}</p>
              )}
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-5 h-5" />
                  {service.duration_min} דקות
                </span>
                <span className="flex items-center gap-1.5 text-gold font-bold text-lg">
                  ₪{Number(service.price)}
                </span>
              </div>
            </div>
            {service.image_url && (
              <img
                src={service.image_url}
                alt={service.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* Step 1: Calendar */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold text-primary-foreground flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-xl font-bold text-foreground">בחר תאריך</h3>
          </div>
          {availabilityLoading ? (
            <DatePickerSkeleton />
          ) : (
            <DatePicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              maxDate={addDays(new Date(), settings?.max_advance_days ?? 30)}
              disabledDays={disabledDays}
              availabilityCounts={availabilityCounts ?? {}}
              businessId={businessId}
            />
          )}
        </div>

        {/* Step 2: Time Slots */}
        {selectedDate && (
          <div ref={timeSlotRef} className="animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-foreground">
                בחר שעה
              </h3>
              <span className="text-sm text-muted-foreground">
                • {formatHebrewDate(selectedDate)}
              </span>
            </div>
            <TimeSlotPicker
              slots={slots ?? []}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              isLoading={slotsLoading}
            />
          </div>
        )}

        {/* Step 3: Form */}
        {selectedTime && selectedDate && (
          <div ref={formRef} className="animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-foreground">אישור פרטים</h3>
            </div>

            {/* Booking Summary */}
            <div className="bg-card rounded-xl border-2 border-border p-6 mb-6">
              <h4 className="font-semibold text-foreground mb-3">סיכום הזמנה</h4>
              <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {formatHebrewDate(selectedDate)}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {selectedTime}
                </p>
                <p className="flex items-center gap-2 text-gold font-bold text-lg">
                  <Tag className="w-5 h-5" />
                  ₪{Number(service.price)}
                </p>
              </div>
            </div>

            <BookingForm
              onSubmit={(data) => createBooking.mutate(data)}
              isSubmitting={createBooking.isPending}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BookService;
