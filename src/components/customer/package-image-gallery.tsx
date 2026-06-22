"use client";

import { useMemo, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { PLACEHOLDER_TRAVEL_IMAGE } from "@/lib/media/travel-images";
import { cn } from "@/lib/utils";

interface PackageImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

const MAX_VISIBLE = 4;

export function PackageImageGallery({ images, alt, className }: PackageImageGalleryProps) {
  const slides = useMemo(
    () => (images.length > 0 ? images : [PLACEHOLDER_TRAVEL_IMAGE]),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const showMoreOverlay = slides.length > MAX_VISIBLE;
  const thumbCount = showMoreOverlay ? MAX_VISIBLE : Math.min(slides.length, MAX_VISIBLE);
  const extraCount = slides.length - (MAX_VISIBLE - 1);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted shadow-sm">
        <SafeImage
          src={slides[activeIndex] ?? PLACEHOLDER_TRAVEL_IMAGE}
          alt={`${alt} — photo ${activeIndex + 1}`}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
        />
      </div>

      {thumbCount > 1 && (
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {Array.from({ length: thumbCount }).map((_, index) => {
            const isMoreSlot = showMoreOverlay && index === MAX_VISIBLE - 1;
            const imageIndex = isMoreSlot ? MAX_VISIBLE - 1 : index;

            return (
              <button
                key={`thumb-${index}`}
                type="button"
                onClick={() => setActiveIndex(imageIndex)}
                className={cn(
                  "relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all",
                  activeIndex === imageIndex
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-primary/40"
                )}
                aria-label={
                  isMoreSlot
                    ? `View ${extraCount} more photos`
                    : `View photo ${index + 1}`
                }
              >
                <SafeImage
                  src={slides[imageIndex]}
                  alt={`${alt} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
                {isMoreSlot && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                    +{extraCount} Photos
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
