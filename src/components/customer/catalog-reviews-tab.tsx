"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RatingStars } from "@/components/customer/rating-stars";
import { entityReviewsPath, generateCatalogReviews } from "@/lib/catalog/catalog-reviews";
import { localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { ServiceType } from "@/types";

const PREVIEW_COUNT = 5;

interface CatalogReviewsTabProps {
  serviceType: ServiceType;
  serviceId: string;
  entityName: string;
  rating: number;
  reviewCount: number;
  description: string;
}

export function CatalogReviewsTab({
  serviceType,
  serviceId,
  entityName,
  rating,
  reviewCount,
  description,
}: CatalogReviewsTabProps) {
  const { locale } = useAppStore();

  const previewReviews = generateCatalogReviews({
    serviceType,
    serviceId,
    entityName,
    rating,
    reviewCount,
  }).slice(0, PREVIEW_COUNT);

  const reviewsHref = entityReviewsPath(serviceType, serviceId);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 text-center">
        <RatingStars rating={rating} reviewCount={reviewCount} className="justify-center" />
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Link
          href={reviewsHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          Read all {reviewCount} reviews
        </Link>
      </div>

      <div className="space-y-3">
        {previewReviews.map((review) => (
          <div key={review.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{review.userName}</p>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      "h-3.5 w-3.5",
                      index < review.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {localizedText(review.comment, locale)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
