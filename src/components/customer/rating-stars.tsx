import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  reviewCount,
  className,
}: {
  rating: number;
  reviewCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  );
}
