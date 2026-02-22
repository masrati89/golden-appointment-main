import { useState, useMemo, memo } from 'react';
import {
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
  format,
} from 'date-fns';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { hebrewDays, hebrewMonths, isDateFull } from '@/lib/dateHelpers';
import { useMonthAvailability } from '@/hooks/useMonthAvailability';

/** Maximum appointments per day - day is marked "Full" when count >= this (must match useMonthAvailability) */
export const MAX_APPOINTMENTS_PER_DAY = 8;

/** Friday=5, Saturday=6 - always disabled regardless of settings */
const FIXED_DISABLED_DAYS = [5, 6];

interface DatePickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  maxDate?: Date;
  disabledDays?: number[];
  businessId?: string | null;
}

const DatePicker = memo(({
  selectedDate,
  onSelectDate,
  maxDate,
  disabledDays = [],
  businessId,
}: DatePickerProps) => {
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(selectedDate ?? today);

  const { data: fullDates = [] } = useMonthAvailability(currentMonth, businessId);

  const canGoPrev = isSameMonth(currentMonth, today) ? false : true;
  const canGoNext = maxDate ? isBefore(startOfMonth(addMonths(currentMonth, 1)), maxDate) : true;

  const mergedDisabledDays = useMemo(() => {
    return [...new Set([...FIXED_DISABLED_DAYS, ...disabledDays])];
  }, [disabledDays]);

  const isDayClosed = useMemo(
    () => (date: Date) => mergedDisabledDays.includes(date.getDay()),
    [mergedDisabledDays],
  );

  const datesInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = start.getDay();
    const padding: (null)[] = Array.from({ length: startDayOfWeek }, () => null);
    return [...padding, ...days];
  }, [currentMonth]);

  return (
    <div className="glass-card p-4 md:p-6 max-w-[340px] mx-auto rounded-3xl">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={!canGoNext}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.95]"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        <h3 className="text-lg font-bold text-foreground">
          {hebrewMonths[currentMonth.getMonth()]} {format(currentMonth, 'yyyy')}
        </h3>

        <button
          onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoPrev}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.95]"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {hebrewDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {datesInMonth.map((date, index) => {
          if (!date) {
            return <div key={`pad-${index}`} className="aspect-square" />;
          }

          const isPast = isBefore(date, today);
          const isClosed = isDayClosed(date);
          const isTooFar = maxDate ? isBefore(maxDate, date) : false;
          const isFull = isDateFull(date, fullDates);
          const isUnavailable = isPast || isClosed || isTooFar || isFull;
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const isFixedBlocked = FIXED_DISABLED_DAYS.includes(date.getDay());

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isUnavailable && onSelectDate(date)}
              disabled={isUnavailable}
              aria-disabled={isUnavailable}
              title={isFull ? 'היומן מלא ליום זה' : undefined}
              className={`
                aspect-square min-h-[40px] rounded-xl font-medium
                transition-all duration-200 flex flex-col items-center justify-center py-1 active:scale-[0.95]
                ${isSelected
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : isFull
                    ? 'day-full bg-destructive/15 text-destructive/90 cursor-not-allowed pointer-events-none select-none opacity-50'
                    : isFixedBlocked
                      ? 'bg-muted/60 text-muted-foreground/50 cursor-not-allowed pointer-events-none opacity-50'
                      : isUnavailable
                        ? 'bg-secondary/50 text-muted-foreground/40 cursor-not-allowed opacity-50'
                        : 'border border-border hover:border-primary hover:bg-primary/5 hover:scale-105'
                }
                ${isTodayDate && !isSelected ? 'border-2 border-primary/40' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full w-full py-1">
                <span className="text-sm font-medium">{date.getDate()}</span>
                {isFull && !isSelected && (
                  <span className="text-[10px] font-bold text-red-500 mt-0.5 leading-none">
                    מלא
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
