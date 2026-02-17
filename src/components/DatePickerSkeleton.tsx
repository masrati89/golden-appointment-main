import { Skeleton } from '@/components/ui/skeleton';
import { hebrewDays } from '@/lib/dateHelpers';

/**
 * Skeleton that matches the DatePicker layout - month nav, headers, day grid.
 * Shown while availability data is loading to avoid empty calendar / flicker.
 */
export function DatePickerSkeleton() {
  const padCount = 2; // Approx leading padding for first week
  const dayCount = 31 + padCount;

  return (
    <div className="glass-card p-4 md:p-6 max-w-[340px] mx-auto rounded-3xl">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-11 h-11 rounded-xl" />
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {hebrewDays.map((day) => (
          <div key={day} className="text-center py-1">
            <Skeleton className="h-3 w-6 mx-auto rounded" />
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: dayCount }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-square min-h-[40px] rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
