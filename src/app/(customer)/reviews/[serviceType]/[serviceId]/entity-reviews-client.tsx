"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { localizedText } from "@/lib/i18n";
import type { Review } from "@/types";

interface EntityReviewsClientProps {
  reviews: Review[];
  entityName: string;
  rating: number;
  reviewCount: number;
}

export default function EntityReviewsClient({
  reviews,
  entityName,
  rating,
  reviewCount,
}: EntityReviewsClientProps) {
  const { locale } = useAppStore();

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="mb-10 rounded-xl bg-primary/5 p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {entityName}
        </p>
        <p className="mt-2 text-4xl font-bold text-primary">{rating.toFixed(1)}</p>
        <div className="mt-2 flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-5 w-5 ${
                index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-muted-foreground">
          Based on {reviewCount} verified reviews
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {review.userName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{review.userName}</p>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {localizedText(review.comment, locale)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString(
                      locale === "hi" ? "hi-IN" : "en-IN"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
