import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TripJackHotelGridSkeleton() {
  return (
    <Card className="overflow-hidden pt-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t">
        <div className="space-y-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </CardFooter>
    </Card>
  );
}

export function TripJackResultsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TripJackHotelGridSkeleton key={i} />
      ))}
    </div>
  );
}
