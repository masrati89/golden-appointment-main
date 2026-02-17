export function BookingCardSkeleton() {
  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 bg-muted rounded-lg w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded-lg w-1/2" />
        </div>
        <div className="h-6 w-16 bg-muted rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-muted rounded-lg" />
        <div className="h-9 w-20 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
