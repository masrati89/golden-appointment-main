import { Skeleton } from '@/components/ui/skeleton';

const ServiceCardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl shadow-md overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
};

export const ServicesGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default ServiceCardSkeleton;
