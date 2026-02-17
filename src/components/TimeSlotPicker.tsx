import { useMemo, memo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { TimeSlot } from '@/lib/slotAvailability';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  isLoading?: boolean;
}

const TIME_PERIODS = [
  { name: 'בוקר', icon: '🌅', start: '06:00', end: '12:00' },
  { name: 'צהריים', icon: '☀️', start: '12:00', end: '15:00' },
  { name: 'אחר הצהריים', icon: '🌇', start: '15:00', end: '23:59' },
];

function SlotsSkeleton() {
  return (
    <div className="glass-card p-5 space-y-4 rounded-2xl shadow-sm">
      <div className="h-6 bg-muted rounded w-1/3" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-11 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const TimeSlotPicker = memo(({
  slots,
  selectedTime,
  onSelectTime,
  isLoading,
}: TimeSlotPickerProps) => {
  const availableSlots = slots.filter((s) => s.available);

  const groupedSlots = useMemo(() => {
    return TIME_PERIODS.map((period) => {
      const periodSlots = slots.filter(
        (s) => s.time >= period.start && s.time < period.end
      );
      const availableCount = periodSlots.filter((s) => s.available).length;
      return { ...period, slots: periodSlots, availableCount };
    }).filter((p) => p.slots.length > 0);
  }, [slots]);

  if (isLoading) return <SlotsSkeleton />;

  if (availableSlots.length === 0) {
    return (
      <div className="glass-card border-2 border-amber-200 dark:border-amber-800 p-6 text-center rounded-2xl shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-1">
          אין שעות פנויות בתאריך זה
        </h3>
        <p className="text-sm text-muted-foreground">אנא בחר תאריך אחר מהלוח</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-3 sm:p-5 rounded-2xl shadow-sm space-y-2 sm:space-y-3">
      {groupedSlots.map((period) => {
        if (period.availableCount === 0) return null;

        return (
          <div key={period.name} className="space-y-1.5">
            {/* Period Header — compact */}
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-1">
                <span>{period.icon}</span>
                {period.name}
              </h4>
              <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {period.availableCount}
              </span>
            </div>

            {/* Slots Grid — dense: 4–5 cols on mobile, smaller tap targets */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {period.slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && onSelectTime(slot.time)}
                  disabled={!slot.available}
                  className={`
                    min-h-[36px] sm:min-h-[40px] rounded-lg text-xs sm:text-sm font-medium py-1.5 px-1
                    transition-all duration-200 active:scale-[0.97]
                    ${selectedTime === slot.time
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : slot.available
                        ? 'bg-card border border-border hover:border-primary hover:bg-primary/5'
                        : 'bg-secondary text-muted-foreground/40 line-through cursor-not-allowed'}
                  `}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-0.5">
        {availableSlots.length} שעות פנויות
      </p>
    </div>
  );
});

TimeSlotPicker.displayName = 'TimeSlotPicker';

export default TimeSlotPicker;
