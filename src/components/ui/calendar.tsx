import * as React from "react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { isDateFull } from "@/lib/dateHelpers";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Dates that are fully booked (yyyy-MM-dd). Rendered with "מלא", disabled, opacity-50, pointer-events-none. */
  fullyBookedDates?: string[];
};

/**
 * Custom day content that shows the date number and "מלא" for fully booked days.
 * Use with Calendar via components={{ DayContent: ... }} or pass fullyBookedDates to Calendar.
 */
export function DayContentFull({
  date,
  isFull,
}: {
  date: Date;
  isFull: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <span>{date.getDate()}</span>
      {isFull && (
        <span className="text-[10px] text-destructive font-bold leading-none mt-1">
          מלא
        </span>
      )}
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fullyBookedDates,
  disabled: disabledProp,
  components: componentsProp,
  ...props
}: CalendarProps) {
  const fullDatesArray = useMemo(() => fullyBookedDates ?? [], [fullyBookedDates]);
  const hasFullDates = fullDatesArray.length > 0;

  const disabled = useMemo(() => {
    const fullMatcher = (date: Date) => isDateFull(date, fullDatesArray);
    if (!disabledProp) return fullMatcher;
    if (typeof disabledProp === "function") {
      return (date: Date) => fullMatcher(date) || disabledProp(date);
    }
    if (Array.isArray(disabledProp)) {
      return (date: Date) => fullMatcher(date) || (disabledProp as Date[]).some((d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
    }
    return fullMatcher;
  }, [disabledProp, fullDatesArray]);

  const DayContentCustom = useMemo(
    () =>
      function DayContentCustomInner({
        date,
      }: {
        date: Date;
        displayMonth: Date;
        activeModifiers: Record<string, boolean>;
      }) {
        const isFull = isDateFull(date, fullDatesArray);
        return (
          <div className="flex flex-col items-center justify-center h-full w-full py-1">
            <span className="text-sm font-medium">{date.getDate()}</span>
            {isFull && (
              <span className="text-[10px] font-bold text-red-500 mt-0.5 leading-none">
                מלא
              </span>
            )}
          </div>
        );
      },
    [fullDatesArray]
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      disabled={hasFullDates ? disabled : disabledProp}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none select-none",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        ...(hasFullDates ? { DayContent: DayContentCustom } : {}),
        ...componentsProp,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
