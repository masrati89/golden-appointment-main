import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingFormSchema, type BookingFormData } from '@/lib/validations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  isSubmitting: boolean;
}

const BookingForm = ({ onSubmit, isSubmitting }: BookingFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-2xl shadow-lg p-6 md:p-8">
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6 md:mb-8">פרטים אישיים</h3>

      <div className="space-y-6">
        {/* Name */}
        <div>
          <Label htmlFor="name" className="block text-base font-semibold mb-2">
            שם מלא <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register('customerName')}
            placeholder="הזן את שמך המלא"
            className="h-14 text-lg px-4 rounded-xl border-2"
            disabled={isSubmitting}
          />
          {errors.customerName && (
            <p className="text-destructive text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.customerName.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="block text-base font-semibold mb-2">
            מספר טלפון <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register('customerPhone')}
            placeholder="05X-XXX-XXXX"
            className="h-14 text-lg px-4 rounded-xl border-2"
            disabled={isSubmitting}
            dir="ltr"
          />
          {errors.customerPhone && (
            <p className="text-destructive text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.customerPhone.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="block text-base font-medium text-muted-foreground mb-2">
            אימייל <span className="text-sm">(אופציונלי)</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register('customerEmail')}
            placeholder="example@email.com"
            className="h-14 text-lg px-4 rounded-xl border-2"
            disabled={isSubmitting}
            dir="ltr"
          />
          {errors.customerEmail && (
            <p className="text-destructive text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.customerEmail.message}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="block text-base font-medium text-muted-foreground mb-2">
            הערות
          </Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="הערות או בקשות מיוחדות"
            className="min-h-24 text-lg px-4 py-3 rounded-xl border-2 resize-none"
            disabled={isSubmitting}
          />
          {errors.notes && (
            <p className="text-destructive text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.notes.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 rounded-xl text-lg font-semibold
                     bg-gold hover:bg-gold-dark text-primary-foreground
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     shadow-md hover:shadow-lg
                     active:scale-[0.98]
                     flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              אישור והזמנה
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default BookingForm;
