import { CheckCircle, Home, Calendar } from 'lucide-react';
import { formatHebrewDate, getHebrewDayName } from '@/lib/dateHelpers';

interface BookingConfirmationProps {
  serviceName: string;
  servicePrice: number;
  bookingDate: Date;
  bookingTime: string;
  customerName: string;
  onGoHome: () => void;
}

const BookingConfirmation = ({
  serviceName,
  servicePrice,
  bookingDate,
  bookingTime,
  customerName,
  onGoHome,
}: BookingConfirmationProps) => {
  return (
    <div className="text-center animate-fade-in mt-8">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />

      <h2 className="text-2xl font-bold text-foreground mb-2">
        ההזמנה התקבלה בהצלחה!
      </h2>
      <p className="text-muted-foreground mb-8">
        {customerName}, תודה שבחרת בנו
      </p>

      <div className="bg-card rounded-2xl shadow-lg p-6 text-right space-y-4 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gold flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">תאריך ושעה</p>
            <p className="font-semibold text-foreground">
              יום {getHebrewDayName(bookingDate)}, {formatHebrewDate(bookingDate)} בשעה {bookingTime}
            </p>
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <p className="text-sm text-muted-foreground">שירות</p>
          <p className="font-semibold text-foreground">{serviceName}</p>
        </div>

        <div className="border-t border-border" />

        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-gold">₪{servicePrice}</span>
          <span className="text-sm text-muted-foreground">מחיר כולל</span>
        </div>
      </div>

      <button
        onClick={onGoHome}
        className="mt-8 inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-primary-foreground
                   px-8 py-3 rounded-xl font-semibold transition-all active:scale-95 min-h-12"
      >
        <Home className="w-5 h-5" />
        חזרה לדף הבית
      </button>
    </div>
  );
};

export default BookingConfirmation;
