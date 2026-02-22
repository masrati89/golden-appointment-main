import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useBusinessSafe } from '@/contexts/BusinessContext';
import { saveBookingState, getAndClearBookingState } from '@/lib/bookingState';
import { Info, Lock } from 'lucide-react';
import {
  Clock,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  Loader2,
  Check,
  Banknote,
  Building2,
  Wallet,
  Smartphone,
  CreditCard,
} from 'lucide-react';

import Layout from '@/components/Layout';
import DatePicker from '@/components/DatePicker';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import { ServicesGridSkeleton } from '@/components/ServiceCardSkeleton';
import { useSettings } from '@/hooks/useSettings';
import { useServices } from '@/hooks/useServices';
import { getAvailableSlots } from '@/lib/slotAvailability';
import { formatHebrewDate } from '@/lib/dateHelpers';
import { scrollToStep } from '@/lib/scrollToStep';
import { bookingFormSchema, type BookingFormData } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StripePayment from '@/components/StripePayment';

type PaymentMethod = 'cash' | 'bank_transfer' | 'bit' | 'deposit_only' | 'stripe';

function calculateDeposit(
  totalPrice: number,
  settings: { is_deposit_active?: boolean | null; deposit_fixed_amount?: number | null; deposit_percentage?: number | null }
): number {
  if (!settings.is_deposit_active) return 0;
  if (settings.deposit_fixed_amount && settings.deposit_fixed_amount > 0) return settings.deposit_fixed_amount;
  if (settings.deposit_percentage && settings.deposit_percentage > 0) return totalPrice * (settings.deposit_percentage / 100);
  return 0;
}

/* ─── Step Number Badge ─── */
function StepBadge({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 sm:mb-3 max-w-[340px] mx-auto">
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
        {number}
      </div>
      <h3 className="text-sm sm:text-base font-bold text-foreground">{title}</h3>
    </div>
  );
}

const BookingVertical = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { businessId, business } = useBusinessSafe();
  const { data: settings } = useSettings(businessId);
  const { data: services, isLoading: servicesLoading } = useServices(businessId);
  const { isAuthenticated, isLoading: authLoading } = useClientAuth();

  // Selection state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [stripeSuccessLoading, setStripeSuccessLoading] = useState(false);

  // Refs for auto-scroll
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { customerName: '', customerPhone: '', customerEmail: '', notes: '' },
  });

  // Settings
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4];
  const disabledDays = allDays.filter((d) => !workingDays.includes(d));

  const now = new Date();

  // Slots query
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', selectedService?.id, selectedDate?.toISOString()],
    queryFn: () => getAvailableSlots(selectedDate!, selectedService!.id, supabase, businessId),
    enabled: !!selectedDate && !!selectedService,
  });

  const depositAmount = useMemo(() => {
    if (!selectedService || !settings) return 0;
    return calculateDeposit(Number(selectedService.price), settings);
  }, [selectedService, settings]);

  // Auto-scroll with offset so step is below header and fully visible (smooth, no cut-off)
  const scrollToStepRef = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      setTimeout(() => scrollToStep(el, { behavior: 'smooth' }), 80);
    });
  }, []);

  useEffect(() => { if (selectedService) scrollToStepRef(calendarRef); }, [selectedService, scrollToStepRef]);
  useEffect(() => { if (selectedDate) scrollToStepRef(timeRef); }, [selectedDate, scrollToStepRef]);
  useEffect(() => { if (selectedTime) scrollToStepRef(formRef); }, [selectedTime, scrollToStepRef]);

  // Form data stored for payment step
  const [formData, setFormData] = useState<BookingFormData | null>(null);

  // Restore booking state after login
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const savedState = getAndClearBookingState();
      if (savedState) {
        // Restore service
        const service = services?.find((s) => s.id === savedState.serviceId);
        if (service) {
          setSelectedService(service);
          setSelectedDate(parseISO(savedState.selectedDate));
          setSelectedTime(savedState.selectedTime);
          setFormData(savedState.formData);
          if (savedState.selectedPayment) {
            setSelectedPayment(savedState.selectedPayment as PaymentMethod);
          }
          toast.success('פרטי ההזמנה שלך שוחזרו', {
            description: 'אתה יכול להמשיך עם ההזמנה',
          });
        }
      }
    }
  }, [authLoading, isAuthenticated, services]);

  // Auto-scroll to payment section after it renders
  useEffect(() => {
    if (formData) {
      const timeoutId = setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [formData]);

  const onFormSubmit = (data: BookingFormData) => {
    setFormData(data);
  };

  // Check authentication before booking
  const requireAuth = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Save booking state before redirecting
      if (selectedService && selectedDate && selectedTime && formData) {
        saveBookingState({
          serviceId: selectedService.id,
          selectedDate: format(selectedDate, 'yyyy-MM-dd'),
          selectedTime: selectedTime,
          formData: {
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerEmail: formData.customerEmail || '',
            notes: formData.notes,
          },
          selectedPayment: selectedPayment || undefined,
          returnPath: location.pathname + location.search,
        });
      }
      toast.info('יש להתחבר כדי להשלים את ההזמנה', {
        description: 'אחרי ההתחברות תועבר חזרה להזמנה',
      });
      navigate('/login', { state: { from: location.pathname } });
      return false;
    }
    return true;
  };

  // Booking mutation
  const createBooking = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      // Check authentication first
      const isAuthenticated = await requireAuth();
      if (!isAuthenticated) {
        throw new Error('נדרשת התחברות');
      }

      if (!formData || !selectedDate || !selectedTime || !selectedService) throw new Error('חסרים פרטים');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      let conflictQuery = supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', dateStr)
        .eq('booking_time', selectedTime)
        .in('status', ['confirmed', 'pending']);
      if (businessId) conflictQuery = conflictQuery.eq('business_id', businessId);
      const { data: conflict } = await conflictQuery.maybeSingle();

      if (conflict) throw new Error('השעה נתפסה, אנא בחר שעה אחרת');

      // Get current user for client_id
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      // בדוק rate limiting — לא יותר מ-3 הזמנות פעילות ללקוח
      if (userId) {
        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('client_id', userId)
          .in('status', ['confirmed', 'pending'])
          .gte('booking_date', format(new Date(), 'yyyy-MM-dd'));

        if (activeBookings && activeBookings.length >= 3) {
          throw new Error('לא ניתן לקבוע יותר מ-3 תורים פעילים בו זמנית');
        }
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          service_id: selectedService.id,
          booking_date: dateStr,
          booking_time: selectedTime,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail || session?.user?.email || null,
          client_id: userId, // Link booking to authenticated user
          business_id: businessId || null,
          notes: formData.notes || null,
          total_price: Number(selectedService.price),
          payment_method: method,
          deposit_amount: depositAmount,
          payment_status: method === 'cash' ? 'pending' : method === 'stripe' ? 'pending' : 'partial',
          status: method === 'stripe' ? 'pending' : 'pending',
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
            customer_email: formData.customerEmail || session?.user?.email || null,
            booking_date: dateStr,
            booking_time: selectedTime,
            service_name: selectedService.name,
            service_duration_min: selectedService.duration_min,
            notes: formData.notes || null,
          },
        }).catch((err) => {
          console.error('Failed to create Google Calendar event:', err);
        });
      }

      try {
        const { data: { session: waSession } } = await supabase.auth.getSession();
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            booking: {
              id: data.id,
              customer_name: formData.customerName,
              customer_phone: formData.customerPhone,
              booking_date: dateStr,
              booking_time: selectedTime,
              total_price: Number(selectedService.price),
              notes: formData.notes || null,
            },
            service: {
              name: selectedService.name,
              duration_min: selectedService.duration_min,
            },
            business_id: businessId,
          },
          headers: waSession?.access_token
            ? { Authorization: `Bearer ${waSession.access_token}` }
            : undefined,
        });
      } catch (err) {
        console.warn('WhatsApp notification skipped/failed:', err);
      }

      return data;
    },
    onSuccess: (data, method) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['availability-counts'] });
      
      // For Stripe, show payment form instead of navigating
      if (method === 'stripe') {
        setCreatedBookingId(data.id);
        return;
      }

      navigate(`/b/${business?.slug}/success`, {
        state: {
          serviceName: selectedService!.name,
          serviceDuration: selectedService!.duration_min,
          bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
          bookingTime: selectedTime!,
          totalPrice: Number(selectedService!.price),
          customerName: formData!.customerName,
          depositAmount: depositAmount,
          paymentMethod: method,
          notes: data.notes,
        },
        replace: true,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle Stripe payment success
  const handleStripeSuccess = async () => {
    if (!createdBookingId) return;
    setStripeSuccessLoading(true);
    try {
      const bookingRes = await supabase.from('bookings').select('*').eq('id', createdBookingId).single();
      if (bookingRes.data && selectedService) {
        try {
          const { data: { session: waSession } } = await supabase.auth.getSession();
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              booking: {
                id: bookingRes.data.id,
                customer_name: bookingRes.data.customer_name,
                customer_phone: bookingRes.data.customer_phone,
                booking_date: bookingRes.data.booking_date,
                booking_time: bookingRes.data.booking_time,
                total_price: bookingRes.data.total_price,
                notes: bookingRes.data.notes || null,
              },
              service: {
                name: selectedService.name,
                duration_min: selectedService.duration_min,
              },
              business_id: businessId,
            },
            headers: waSession?.access_token
              ? { Authorization: `Bearer ${waSession.access_token}` }
              : undefined,
          });
        } catch (err) {
          console.warn('WhatsApp notification skipped/failed:', err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['fully-booked-dates'] });

      navigate(`/b/${business?.slug}/success`, {
      state: {
        serviceName: selectedService!.name,
        serviceDuration: selectedService!.duration_min,
        bookingDate: format(selectedDate!, 'yyyy-MM-dd'),
        bookingTime: selectedTime!,
        totalPrice: Number(selectedService!.price),
        customerName: formData!.customerName,
        depositAmount: 0,
        paymentMethod: 'stripe',
        notes: formData!.notes,
      },
      replace: true,
    });
    } finally {
      setStripeSuccessLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedPayment(null);
    setFormData(null);
    setPaymentMethod(null);
    resetForm();
  };

  // Payment methods
  const paymentMethods = useMemo(() => {
    if (!settings || !selectedService) return [];
    const totalPrice = Number(selectedService.price);
    return [
      { id: 'cash' as PaymentMethod, icon: Banknote, title: 'מזומן', description: 'תשלום במזומן בזמן ההגעה', amount: totalPrice, enabled: settings.payment_cash_enabled !== false, badge: null },
      { id: 'bank_transfer' as PaymentMethod, icon: Building2, title: 'העברה בנקאית', description: 'העברה לחשבון הבנק', amount: settings.is_deposit_active ? depositAmount : totalPrice, enabled: settings.payment_bank_enabled !== false, badge: settings.is_deposit_active ? 'מקדמה' : null },
      { id: 'bit' as PaymentMethod, icon: Smartphone, title: 'Bit', description: `העברה ל-${settings.bit_phone_number || 'Bit'}`, amount: settings.is_deposit_active ? depositAmount : totalPrice, enabled: settings.payment_bit_enabled === true && !!settings.bit_phone_number, badge: 'מהיר' },
      { id: 'deposit_only' as PaymentMethod, icon: Wallet, title: 'מקדמה בלבד', description: `תשלום ₪${depositAmount}, יתרה במזומן`, amount: depositAmount, enabled: settings.is_deposit_active === true && depositAmount > 0, badge: 'מומלץ' },
      { id: 'stripe' as PaymentMethod, icon: CreditCard, title: 'כרטיס אשראי', description: 'תשלום מאובטח בכרטיס אשראי', amount: totalPrice, enabled: settings.payment_stripe_enabled === true && !!settings.stripe_publishable_key, badge: 'מאובטח' },
    ].filter((m) => m.enabled);
  }, [settings, selectedService, depositAmount]);

  /* ═══ MAIN VERTICAL FLOW ═══ */
  const stepSectionClass = 'scroll-mt-[76px] min-h-0';
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-0 sm:py-1 space-y-3 sm:space-y-4 md:space-y-5">
        {/* Compact Hero */}
        <section className="text-center py-2 sm:py-3">
          <h2 className="text-lg font-bold text-foreground mb-0.5">בחרו טיפול וקבעו תור</h2>
        </section>

        {/* Step 1: Services - Compact Grid */}
        <section data-tour="services" className={stepSectionClass}>
          <StepBadge number={1} title="בחר טיפול" />
          {servicesLoading && <ServicesGridSkeleton />}
          {services && (
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 max-w-[340px] mx-auto">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setFormData(null);
                    setSelectedPayment(null);
                  }}
                  className={`glass-card p-3 text-center transition-all duration-200 active:scale-[0.97] border-2 rounded-2xl shadow-sm
                    ${selectedService?.id === service.id
                      ? 'border-primary bg-primary/10 shadow-gold-md'
                      : 'border-transparent hover:border-primary/30'}`}
                >
                  <h4 className="font-semibold text-foreground text-sm leading-tight">{service.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{service.duration_min} דק׳</p>
                  <p className="text-base font-bold text-primary mt-1">₪{Number(service.price)}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Calendar — full-days from useMonthAvailability inside DatePicker */}
        {selectedService && (
          <section ref={calendarRef} className={`animate-slide-up ${stepSectionClass}`} data-tour="calendar">
            <StepBadge number={2} title="בחר תאריך" />
            <DatePicker
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
                setFormData(null);
                setSelectedPayment(null);
              }}
              maxDate={addDays(new Date(), settings?.max_advance_days ?? 30)}
              disabledDays={disabledDays}
              businessId={businessId}
            />
          </section>
        )}

        {/* Step 3: Time Slots */}
        {selectedDate && selectedService && (
          <section ref={timeRef} className={`animate-slide-up ${stepSectionClass}`}>
            <StepBadge number={3} title="בחר שעה" />
            <p className="text-sm text-muted-foreground -mt-2 sm:-mt-3 mb-3 sm:mb-4 max-w-[340px] mx-auto">
              {formatHebrewDate(selectedDate)}
            </p>
            <div className="max-w-[340px] mx-auto">
              <TimeSlotPicker
                slots={slots ?? []}
                selectedTime={selectedTime}
                onSelectTime={(time) => {
                  setSelectedTime(time);
                  setFormData(null);
                  setSelectedPayment(null);
                }}
                isLoading={slotsLoading}
              />
            </div>
          </section>
        )}

        {/* Step 4: Details Form */}
        {selectedTime && selectedDate && selectedService && (
          <section ref={formRef} className={`animate-slide-up ${stepSectionClass}`}>
            <StepBadge number={4} title="פרטים אישיים" />

            {/* Auth Notice */}
            {!isAuthenticated && !authLoading && (
              <div className="max-w-[340px] mx-auto mb-3 sm:mb-4">
                <div className="glass-card p-3 sm:p-4 border border-primary/30 bg-primary/5 rounded-xl flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      התחברות נדרשת
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      כדי לשמור על הפרטיות שלך ולנהל את התורים שלך, יש להתחבר למערכת. ההזמנה תישמר אוטומטית.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Card */}
            <div className="glass-card p-3 sm:p-4 mb-3 sm:mb-4 border border-primary/20 max-w-[340px] mx-auto rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{selectedService.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatHebrewDate(selectedDate)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedTime}</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">₪{Number(selectedService.price)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="glass-card p-4 sm:p-5 space-y-3 sm:space-y-4 max-w-[340px] mx-auto rounded-2xl shadow-sm">
              <div>
                <Label className="text-sm font-semibold mb-1 block">שם מלא <span className="text-destructive">*</span></Label>
                <Input {...register('customerName')} placeholder="הזן את שמך המלא" className="h-12 text-base px-4 rounded-xl border-2" />
                {errors.customerName && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.customerName.message}</p>}
              </div>
              <div>
                <Label className="text-sm font-semibold mb-1 block">מספר טלפון <span className="text-destructive">*</span></Label>
                <Input type="tel" {...register('customerPhone')} placeholder="05X-XXX-XXXX" className="h-12 text-base px-4 rounded-xl border-2" dir="ltr" />
                {errors.customerPhone && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.customerPhone.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">אימייל <span className="text-[10px]">(אופציונלי)</span></Label>
                <Input type="email" {...register('customerEmail')} placeholder="example@email.com" className="h-12 text-base px-4 rounded-xl border-2" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">הערות</Label>
                <Textarea {...register('notes')} placeholder="הערות או בקשות מיוחדות" className="min-h-20 text-base px-4 py-3 rounded-xl border-2 resize-none" />
              </div>
              <button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-gold-md hover:shadow-gold-lg active:scale-[0.98] flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Check className="w-5 h-5" />
                המשך לתשלום
              </button>
            </form>
          </section>
        )}

        {/* Step 5: Payment — scroll-margin so header doesn't cover title when scrolling */}
        {formData && selectedService && selectedDate && selectedTime && settings && (
          <section ref={paymentRef} className={`animate-slide-up ${stepSectionClass} scroll-mt-[76px]`}>
            <StepBadge number={5} title="אמצעי תשלום" />

            <div className="flex flex-col max-w-[340px] mx-auto min-h-0" style={{ minHeight: 'min(400px, calc(100dvh - 200px))' }}>
              {/* Compact Order Summary */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-primary/5 border border-primary/20 mb-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{formatHebrewDate(selectedDate)} • {selectedTime}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedService.name}</p>
                </div>
                <span className="text-lg font-bold text-primary flex-shrink-0 mr-3">₪{Number(selectedService.price)}</span>
              </div>

              {/* Deposit Breakdown */}
              {settings.is_deposit_active && depositAmount > 0 && (
                <div className="px-3 py-2 rounded-2xl bg-secondary/50 border border-border mb-3 text-xs space-y-0.5 shadow-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">סה״כ</span><span className="font-semibold">₪{Number(selectedService.price)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">מקדמה</span><span className="font-bold text-primary">₪{depositAmount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">יתרה לתשלום בסלון</span><span className="font-semibold">₪{Number(selectedService.price) - depositAmount}</span></div>
                </div>
              )}

              {/* Payment Methods - scrollable area */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPayment === method.id;
                  const displayAmount = settings.is_deposit_active && depositAmount > 0 && method.id !== 'cash' ? depositAmount : method.amount;

                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedPayment(method.id);
                        if (method.id === 'bit' && settings.bit_payment_url) {
                          window.open(settings.bit_payment_url, '_blank');
                        } else if (method.id === 'bit' && !settings.bit_payment_url) {
                          toast.error('לא הוגדר קישור תשלום Bit');
                        }
                      }}
                      className={`w-full text-right py-3 px-3 rounded-2xl border-2 transition-all duration-200 min-h-[52px] shadow-sm
                        ${isSelected ? 'border-primary bg-primary/5 shadow-gold-md' : 'border-border hover:border-primary/40'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-foreground text-sm">{method.title}</h4>
                            {method.badge && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${method.badge === 'מומלץ' ? 'bg-primary/20 text-primary' : method.badge === 'מהיר' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{method.description}</p>
                        </div>
                        <span className="text-base font-bold text-primary flex-shrink-0">₪{displayAmount}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
                        </div>
                      </div>

                      {/* Expanded info */}
                      {isSelected && method.id === 'bank_transfer' && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5">
                          <p className="font-semibold">פרטי חשבון:</p>
                          {settings.bank_name && <p>בנק: {settings.bank_name}</p>}
                          {settings.bank_branch && <p>סניף: {settings.bank_branch}</p>}
                          {settings.bank_account && <p>חשבון: {settings.bank_account}</p>}
                        </div>
                      )}
                      {isSelected && method.id === 'bit' && settings.bit_payment_url && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 text-center">
                          <p>🔗 נפתח קישור תשלום Bit</p>
                        </div>
                      )}
                      {isSelected && method.id === 'cash' && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-[11px] text-blue-900 dark:text-blue-200">
                          <p>• הביאו תשלום במזומן בזמן התור</p>
                        </div>
                      )}
                      {isSelected && method.id === 'deposit_only' && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5">
                          <p>• שלם מקדמה עכשיו (העברה/Bit)</p>
                          <p>• יתרה של ₪{Number(selectedService.price) - depositAmount} במזומן</p>
                        </div>
                      )}
                      {isSelected && method.id === 'stripe' && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-[11px] text-blue-900 dark:text-blue-200">
                          <p>• תשלום מאובטח דרך Stripe</p>
                          <p>• כל כרטיסי האשראי נתמכים</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer: Policy + Confirm */}
              <div className="mt-auto pt-2 space-y-2">
                {settings.is_deposit_active && depositAmount > 0 && selectedPayment !== 'stripe' && (
                  <p className="text-[11px] text-destructive font-semibold text-center leading-tight">
                    ⚠️ ביטול ללא עלות עד 72 שעות לפני התור. לאחר מכן המקדמה לא תוחזר.
                  </p>
                )}
                
                {/* Stripe Payment Form */}
                {selectedPayment === 'stripe' && createdBookingId && settings.stripe_publishable_key ? (
                  <div className="glass-card p-4 rounded-2xl relative">
                    {stripeSuccessLoading && (
                      <div className="absolute inset-0 bg-background/80 rounded-2xl flex flex-col items-center justify-center gap-2 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm font-medium text-foreground">מעדכן ומעביר...</span>
                      </div>
                    )}
                    <StripePayment
                      bookingId={createdBookingId}
                      amount={Number(selectedService.price)}
                      onSuccess={handleStripeSuccess}
                      onError={(error) => toast.error(error)}
                      publishableKey={settings.stripe_publishable_key}
                    />
                  </div>
                ) : selectedPayment && selectedPayment !== 'stripe' ? (
                  <button
                    onClick={() => createBooking.mutate(selectedPayment)}
                    disabled={createBooking.isPending}
                    className="w-full h-12 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-gold-md hover:shadow-gold-lg active:scale-[0.97] flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {createBooking.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />מאשר...</>
                    ) : (
                      <><Check className="w-5 h-5" />אישור סופי והזמנה</>
                    )}
                  </button>
                ) : selectedPayment === 'stripe' && !createdBookingId ? (
                  <button
                    onClick={() => createBooking.mutate('stripe')}
                    disabled={createBooking.isPending}
                    className="w-full h-12 rounded-2xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-gold-md hover:shadow-gold-lg active:scale-[0.97] flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {createBooking.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />יוצר הזמנה...</>
                    ) : (
                      <><Check className="w-5 h-5" />המשך לתשלום</>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 border-t border-border text-center space-y-2">
          <h3 className="text-base font-semibold text-foreground">{settings?.business_name || 'מכון היופי שלך'}</h3>
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-sm">
            {settings?.business_phone && (
              <a href={`tel:${settings.business_phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="w-4 h-4" /><span>{settings.business_phone}</span>
              </a>
            )}
            {settings?.business_address && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{settings.business_address}</span></div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} כל הזכויות שמורות</p>
        </footer>
      </div>
    </Layout>
  );
};

export default BookingVertical;
