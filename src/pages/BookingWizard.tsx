import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  addDays,
} from 'date-fns';
import { toast } from 'sonner';
import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Clock,
  Calendar,
  Tag,
  Sparkles,
  CheckCircle,
  Home,
  AlertCircle,
  Loader2,
  Check,
  Banknote,
  Building2,
  Wallet,
  Smartphone,
  CreditCard,
  MessageCircle,
  Download,
} from 'lucide-react';

import { useSettings } from '@/hooks/useSettings';
import { useServices } from '@/hooks/useServices';
import { getAvailableSlots, type TimeSlot } from '@/lib/slotAvailability';
import { hebrewDays, hebrewMonths, formatHebrewDate, getHebrewDayName } from '@/lib/dateHelpers';
import { bookingFormSchema, type BookingFormData } from '@/lib/validations';
import { downloadICSFile } from '@/lib/calendar';
import { sendWhatsAppViaEdge } from '@/lib/whatsapp';
import { generateGoogleCalendarLink } from '@/lib/googleCalendar';

import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PaymentMethod = 'cash' | 'bank_transfer' | 'bit' | 'deposit_only' | 'credit';

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;
// 0=Welcome, 1=Services, 2=Calendar+Time, 3=Form, 4=Payment, 5=Confirmation

const STEP_TITLES: Record<WizardStep, string> = {
  0: '',
  1: 'בחר טיפול',
  2: 'בחר תאריך ושעה',
  3: 'פרטים אישיים',
  4: 'אמצעי תשלום',
  5: 'ההזמנה אושרה',
};

/* ─── Deposit Calculation ─── */
function calculateDeposit(
  totalPrice: number,
  settings: { is_deposit_active?: boolean | null; deposit_fixed_amount?: number | null; deposit_percentage?: number | null }
): number {
  if (!settings.is_deposit_active) return 0;
  if (settings.deposit_fixed_amount && settings.deposit_fixed_amount > 0) {
    return settings.deposit_fixed_amount;
  }
  if (settings.deposit_percentage && settings.deposit_percentage > 0) {
    return totalPrice * (settings.deposit_percentage / 100);
  }
  return 0;
}

function getPaymentMethodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    cash: 'מזומן',
    bank_transfer: 'העברה בנקאית',
    bit: 'Bit',
    deposit_only: 'מקדמה בלבד',
    credit: 'כרטיס אשראי',
  };
  return labels[method || ''] || method || '';
}

/* ─── Wizard Header ─── */
function WizardHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center h-14 px-4 border-b border-border flex-shrink-0">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
      <h2 className="flex-1 text-center text-lg font-bold text-foreground pr-11">{title}</h2>
    </div>
  );
}

/* ─── Step 0: Welcome ─── */
function WelcomeScreen({
  businessName,
  logoUrl,
  onStart,
}: {
  businessName: string;
  logoUrl?: string | null;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
      {logoUrl ? (
        <img src={logoUrl} alt={businessName} className="w-28 h-28 rounded-full object-cover mb-8 shadow-lg" />
      ) : (
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mb-8 shadow-lg">
          <Sparkles className="w-14 h-14 text-primary-foreground" />
        </div>
      )}
      <h1 className="text-3xl font-bold text-gold mb-3">ברוכים הבאים</h1>
      <p className="text-xl font-semibold text-foreground mb-2">{businessName}</p>
      <p className="text-muted-foreground text-base mb-12">מזמינים אותך לחווית טיפוח מושלמת</p>
      <button
        onClick={onStart}
        data-tour="services"
        className="w-full max-w-xs h-14 rounded-2xl text-lg font-semibold bg-gold hover:bg-gold-dark text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 animate-pulse"
      >
        הזמנת תור
      </button>
    </div>
  );
}

/* ─── Step 1: Services Grid ─── */
function ServicesScreen({ onSelectService }: { onSelectService: (service: any) => void }) {
  const { data: services, isLoading } = useServices();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted aspect-[3/4]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {services?.map((service) => (
        <button
          key={service.id}
          onClick={() => onSelectService(service)}
          className="bg-card rounded-2xl shadow-md overflow-hidden text-right hover:shadow-lg transition-all duration-200 active:scale-[0.97] border border-border hover:border-gold/30"
        >
          <div className="aspect-square w-full">
            {service.image_url ? (
              <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">{service.name}</h3>
            <p className="text-muted-foreground text-xs mt-1">₪{Number(service.price)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Step 2: Calendar + Time Split ─── */
function CalendarTimeScreen({
  serviceId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: {
  serviceId: string;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
}) {
  const { data: settings } = useSettings();
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(today);

  const maxDate = addDays(new Date(), settings?.max_advance_days ?? 30);
  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4];

  const canGoPrev = !isSameMonth(currentMonth, today);
  const canGoNext = isBefore(startOfMonth(addMonths(currentMonth, 1)), maxDate);

  const datesInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const padding: null[] = Array.from({ length: start.getDay() }, () => null);
    return [...padding, ...days];
  }, [currentMonth]);

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', serviceId, selectedDate?.toISOString()],
    queryFn: () => getAvailableSlots(selectedDate!, serviceId, supabase),
    enabled: !!selectedDate && !!serviceId,
  });

  const availableSlots = slots?.filter((s) => s.available) ?? [];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-shrink-0 px-1">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))} disabled={!canGoNext} className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h3 className="text-lg font-bold text-foreground">
            {hebrewMonths[currentMonth.getMonth()]} {format(currentMonth, 'yyyy')}
          </h3>
          <button onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))} disabled={!canGoPrev} className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {hebrewDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {datesInMonth.map((date, index) => {
            if (!date) return <div key={`pad-${index}`} className="aspect-square" />;
            const isPast = isBefore(date, today);
            const isDisabledDay = !workingDays.includes(date.getDay());
            const isTooFar = isBefore(maxDate, date);
            const isUnavailable = isPast || isDisabledDay || isTooFar;
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);

            return (
              <button
                key={date.toISOString()}
                onClick={() => !isUnavailable && onSelectDate(date)}
                disabled={isUnavailable}
                className={`aspect-square rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center
                  ${isSelected ? 'bg-gold text-primary-foreground shadow-md scale-105' : isUnavailable ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-gold/10 hover:scale-105'}
                  ${isTodayDate && !isSelected ? 'ring-2 ring-gold/40' : ''}`}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border flex-shrink-0" />

      <div className="flex-1 overflow-y-auto scrollbar-hide pt-3 px-1">
        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">בחר תאריך מהלוח למעלה</p>
          </div>
        ) : slotsLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-11 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
            <p className="text-sm font-semibold text-foreground">אין שעות פנויות</p>
            <p className="text-xs text-muted-foreground mt-1">נסה תאריך אחר</p>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              שעות פנויות ל-{formatHebrewDate(selectedDate)}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {slots?.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && onSelectTime(slot.time)}
                  disabled={!slot.available}
                  className={`h-11 rounded-xl text-sm font-medium transition-all duration-200
                    ${selectedTime === slot.time ? 'bg-gold text-primary-foreground shadow-md scale-105' : slot.available ? 'bg-card border border-border hover:border-gold hover:bg-gold/5' : 'bg-secondary/50 text-muted-foreground/30 line-through cursor-not-allowed'}`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: Details Form ─── */
function DetailsScreen({
  service,
  selectedDate,
  selectedTime,
  onSubmit,
}: {
  service: any;
  selectedDate: Date;
  selectedTime: string;
  onSubmit: (data: BookingFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { customerName: '', customerPhone: '', customerEmail: '', notes: '' },
  });

  return (
    <div className="animate-fade-in space-y-4">
      {/* Summary Card */}
      <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-base">{service.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatHebrewDate(selectedDate)}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{selectedTime}</span>
            </div>
          </div>
          <span className="text-xl font-bold text-gold">₪{Number(service.price)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">שם מלא <span className="text-destructive">*</span></Label>
          <Input {...register('customerName')} placeholder="הזן את שמך המלא" className="h-12 text-base rounded-xl border-2" />
          {errors.customerName && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.customerName.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">מספר טלפון <span className="text-destructive">*</span></Label>
          <Input type="tel" {...register('customerPhone')} placeholder="05X-XXX-XXXX" className="h-12 text-base rounded-xl border-2" dir="ltr" />
          {errors.customerPhone && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.customerPhone.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-1.5 block">אימייל <span className="text-xs">(אופציונלי)</span></Label>
          <Input type="email" {...register('customerEmail')} placeholder="example@email.com" className="h-12 text-base rounded-xl border-2" dir="ltr" />
        </div>
        <button
          type="submit"
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-gold hover:bg-gold-dark text-primary-foreground transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.97] flex items-center justify-center gap-2 mt-6"
        >
          <Check className="w-5 h-5" />
          המשך לתשלום
        </button>
      </form>
    </div>
  );
}

/* ─── Step 4: Payment Method Selection ─── */
function PaymentScreen({
  service,
  selectedDate,
  selectedTime,
  formData,
  settings,
  onConfirm,
  isSubmitting,
}: {
  service: any;
  selectedDate: Date;
  selectedTime: string;
  formData: BookingFormData;
  settings: any;
  onConfirm: (method: PaymentMethod) => void;
  isSubmitting: boolean;
}) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const totalPrice = Number(service.price);
  const depositAmount = calculateDeposit(totalPrice, settings);

  const allMethods = [
    {
      id: 'cash' as PaymentMethod,
      icon: Banknote,
      title: 'מזומן',
      description: 'תשלום במזומן בזמן ההגעה',
      amount: totalPrice,
      enabled: settings.payment_cash_enabled !== false,
      badge: null,
    },
    {
      id: 'bank_transfer' as PaymentMethod,
      icon: Building2,
      title: 'העברה בנקאית',
      description: 'העברה לחשבון הבנק',
      amount: settings.is_deposit_active ? depositAmount : totalPrice,
      enabled: settings.payment_bank_enabled !== false,
      badge: settings.is_deposit_active ? 'מקדמה' : null,
    },
    {
      id: 'bit' as PaymentMethod,
      icon: Smartphone,
      title: 'Bit',
      description: `העברה ל-${settings.bit_phone_number || 'Bit'}`,
      amount: settings.is_deposit_active ? depositAmount : totalPrice,
      enabled: settings.payment_bit_enabled === true && !!settings.bit_phone_number,
      badge: 'מהיר',
    },
    {
      id: 'deposit_only' as PaymentMethod,
      icon: Wallet,
      title: 'מקדמה בלבד',
      description: `תשלום ₪${depositAmount}, יתרה במזומן`,
      amount: depositAmount,
      enabled: settings.is_deposit_active === true && depositAmount > 0,
      badge: 'מומלץ',
    },
  ];

  const enabledMethods = allMethods.filter((m) => m.enabled);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Summary */}
      <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">שירות</span>
          <span className="font-semibold text-foreground text-sm">{service.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">תאריך</span>
          <span className="font-semibold text-foreground text-sm">{formatHebrewDate(selectedDate)} • {selectedTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">לקוח</span>
          <span className="font-semibold text-foreground text-sm">{formData.customerName}</span>
        </div>
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">מחיר</span>
          <span className="text-xl font-bold text-gold">₪{totalPrice}</span>
        </div>
      </div>

      {/* Payment Methods */}
      {enabledMethods.length === 0 ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-foreground">אין אמצעי תשלום זמינים</p>
          <p className="text-sm text-muted-foreground mt-1">אנא צור קשר עם בעל העסק</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enabledMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected ? 'border-gold bg-gold/5 shadow-md' : 'border-border hover:border-gold/40'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-gold text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-sm">{method.title}</h4>
                      {method.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${method.badge === 'מומלץ' ? 'bg-gold/20 text-gold-dark' : method.badge === 'מהיר' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {method.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                  </div>
                  <span className="text-lg font-bold text-gold flex-shrink-0">₪{method.amount}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-gold bg-gold' : 'border-muted-foreground/30'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
                  </div>
                </div>

                {/* Payment instructions when selected */}
                {isSelected && method.id === 'bank_transfer' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <p className="font-semibold">פרטי חשבון:</p>
                    {settings.bank_name && <p>בנק: {settings.bank_name}</p>}
                    {settings.bank_branch && <p>סניף: {settings.bank_branch}</p>}
                    {settings.bank_account && <p>חשבון: {settings.bank_account}</p>}
                    {settings.business_phone && <p className="mt-1">* שלחו אישור העברה ל-WhatsApp: {settings.business_phone}</p>}
                  </div>
                )}
                {isSelected && method.id === 'bit' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-900 dark:text-blue-200 text-center space-y-1">
                    <Smartphone className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" />
                    <p className="text-base font-bold">{settings.bit_phone_number}</p>
                    {settings.bit_business_name && <p className="text-xs">{settings.bit_business_name}</p>}
                  </div>
                )}
                {isSelected && method.id === 'deposit_only' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <p>• שלם מקדמה עכשיו (העברה/Bit)</p>
                    <p>• יתרה של ₪{totalPrice - depositAmount} במזומן בזמן התור</p>
                  </div>
                )}
                {isSelected && method.id === 'cash' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <p>• הביאו תשלום במזומן בזמן התור</p>
                    <p>• סכום מדויק מומלץ</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Confirm Button */}
      {selectedMethod && (
        <button
          onClick={() => onConfirm(selectedMethod)}
          disabled={isSubmitting}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-gold hover:bg-gold-dark text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.97] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" />מאשר...</>
          ) : (
            <><Check className="w-5 h-5" />אישור סופי והזמנה</>
          )}
        </button>
      )}
    </div>
  );
}

/* ─── Step 5: Confirmation ─── */
function ConfirmationScreen({
  service,
  selectedDate,
  selectedTime,
  customerName,
  paymentMethod,
  totalPrice,
  depositAmount,
  settings,
  bookingData,
  onGoHome,
}: {
  service: any;
  selectedDate: Date;
  selectedTime: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  totalPrice: number;
  depositAmount: number;
  settings: any;
  bookingData: any;
  onGoHome: () => void;
}) {
  const handleDownloadICS = () => {
    downloadICSFile(
      { booking_date: format(selectedDate, 'yyyy-MM-dd'), booking_time: selectedTime, customer_name: customerName, total_price: totalPrice, deposit_amount: depositAmount, payment_method: paymentMethod, notes: bookingData?.notes },
      { name: service.name, duration_min: service.duration_min },
      { business_name: settings?.business_name, business_phone: settings?.business_phone, business_address: settings?.business_address }
    );
  };

  const amountPaid = paymentMethod === 'cash' ? 0 : paymentMethod === 'deposit_only' ? depositAmount : paymentMethod === 'bank_transfer' || paymentMethod === 'bit' ? (settings?.is_deposit_active ? depositAmount : totalPrice) : totalPrice;
  const remaining = totalPrice - amountPaid;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
      <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
      <h2 className="text-2xl font-bold text-foreground mb-2">ההזמנה התקבלה!</h2>
      <p className="text-muted-foreground mb-6">{customerName}, תודה שבחרת בנו</p>

      {/* Booking Details */}
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm text-right space-y-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">שירות</p>
          <p className="font-semibold text-foreground">{service.name}</p>
        </div>
        <div className="border-t border-border" />
        <div>
          <p className="text-xs text-muted-foreground">תאריך ושעה</p>
          <p className="font-semibold text-foreground">
            יום {getHebrewDayName(selectedDate)}, {formatHebrewDate(selectedDate)} בשעה {selectedTime}
          </p>
        </div>
        <div className="border-t border-border" />
        <div>
          <p className="text-xs text-muted-foreground">אמצעי תשלום</p>
          <p className="font-semibold text-foreground">{getPaymentMethodLabel(paymentMethod)}</p>
        </div>
        <div className="border-t border-border" />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">מחיר</span>
          <span className="text-xl font-bold text-gold">₪{totalPrice}</span>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">
            יתרה לתשלום במזומן: ₪{remaining}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleDownloadICS}
          className="w-full h-12 rounded-2xl border-2 border-gold text-gold hover:bg-gold hover:text-primary-foreground font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          הוסף ליומן
        </button>

        <button
          onClick={onGoHome}
          className="w-full h-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          חזרה לדף הבית
        </button>
      </div>

      {/* Notes */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl text-right w-full max-w-sm">
        <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-2">⚠️ חשוב לדעת</p>
        <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
          <li>• הגיעו 5 דקות לפני השעה</li>
          <li>• ביטול - הודיעו 24 שעות מראש</li>
          {remaining > 0 && <li className="font-semibold">• זכרו להביא ₪{remaining} במזומן</li>}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN WIZARD
   ═══════════════════════════════════════════════════ */
const BookingWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();

  const [step, setStep] = useState<WizardStep>(0);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState('');
  const [formData, setFormData] = useState<BookingFormData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);

  const depositAmount = useMemo(() => {
    if (!selectedService || !settings) return 0;
    return calculateDeposit(Number(selectedService.price), settings);
  }, [selectedService, settings]);

  const goBack = useCallback(() => {
    if (step === 1) setStep(0);
    else if (step === 2) { setSelectedDate(null); setSelectedTime(null); setStep(1); }
    else if (step === 3) { setSelectedTime(null); setStep(2); }
    else if (step === 4) setStep(3);
  }, [step]);

  const createBooking = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (!formData || !selectedDate || !selectedTime || !selectedService) throw new Error('חסרים פרטים');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: conflict } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', dateStr)
        .eq('booking_time', selectedTime)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle();

      if (conflict) throw new Error('השעה נתפסה, אנא בחר שעה אחרת');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          service_id: selectedService.id,
          booking_date: dateStr,
          booking_time: selectedTime,
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          customer_email: formData.customerEmail || null,
          notes: formData.notes || null,
          total_price: Number(selectedService.price),
          payment_method: method,
          deposit_amount: depositAmount,
          payment_status: method === 'cash' ? 'pending' : 'partial',
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Try WhatsApp via edge function (non-blocking)
      sendWhatsAppViaEdge(
        data,
        { name: selectedService.name, duration_min: selectedService.duration_min },
        { business_name: settings?.business_name, business_phone: settings?.business_phone, business_address: settings?.business_address, admin_phone: settings?.admin_phone }
      ).catch(() => {});

      return data;
    },
    onSuccess: (data, method) => {
      setPaymentMethod(method);
      setConfirmedName(formData!.customerName);
      setBookingResult(data);
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      setStep(5);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-0 md:p-4" dir="rtl">
      <div className="w-full h-[100dvh] md:h-[850px] md:max-w-[480px] bg-background md:rounded-3xl md:shadow-2xl overflow-hidden relative flex flex-col md:border md:border-border">
        {step > 0 && step < 5 && <WizardHeader onBack={goBack} title={STEP_TITLES[step]} />}

        <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
          {step === 0 && (
            <WelcomeScreen
              businessName={settings?.business_name || 'מכון היופי שלך'}
              logoUrl={settings?.business_logo_url}
              onStart={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <ServicesScreen onSelectService={(service) => { setSelectedService(service); setStep(2); }} />
          )}

          {step === 2 && selectedService && (
            <CalendarTimeScreen
              serviceId={selectedService.id}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={(date) => { setSelectedDate(date); setSelectedTime(null); }}
              onSelectTime={(time) => { setSelectedTime(time); setTimeout(() => setStep(3), 150); }}
            />
          )}

          {step === 3 && selectedService && selectedDate && selectedTime && (
            <DetailsScreen
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSubmit={(data) => { setFormData(data); setStep(4); }}
            />
          )}

          {step === 4 && selectedService && selectedDate && selectedTime && formData && settings && (
            <PaymentScreen
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              formData={formData}
              settings={settings}
              onConfirm={(method) => createBooking.mutate(method)}
              isSubmitting={createBooking.isPending}
            />
          )}

          {step === 5 && selectedService && selectedDate && selectedTime && paymentMethod && (
            <ConfirmationScreen
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              customerName={confirmedName}
              paymentMethod={paymentMethod}
              totalPrice={Number(selectedService.price)}
              depositAmount={depositAmount}
              settings={settings}
              bookingData={bookingResult}
              onGoHome={() => {
                setStep(0);
                setSelectedService(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setFormData(null);
                setPaymentMethod(null);
                setBookingResult(null);
              }}
            />
          )}
        </div>
        
        <FloatingWhatsApp />
      </div>
    </div>
  );
};

export default BookingWizard;
