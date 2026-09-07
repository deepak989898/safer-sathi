"use client";

import { useEffect, useMemo, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { PLACEHOLDER_TRAVEL_IMAGE } from "@/lib/media/travel-images";
import { cn } from "@/lib/utils";

interface ImageAutoSliderProps {
  images: string[];
  alt: string;
  interval?: number;
  showDots?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Used only after every slide fails — pass a hotel-specific URL, not a shared global one. */
  fallbackSrc?: string;
}

export function ImageAutoSlider({
  images,
  alt,
  interval = 4000,
  showDots = true,
  className,
  imageClassName,
  sizes = "100vw",
  priority = false,
  fallbackSrc = PLACEHOLDER_TRAVEL_IMAGE,
}: ImageAutoSliderProps) {
  const initial = useMemo(() => {
    const unique = [...new Set(images.map((u) => u.trim()).filter(Boolean))];
    return unique.length > 0 ? unique : [fallbackSrc];
  }, [images, fallbackSrc]);

  const [slides, setSlides] = useState(initial);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setSlides(initial);
    setIndex(0);
  }, [initial]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [slides.length, interval, paused]);

  const markFailed = (failedSrc: string) => {
    setSlides((current) => {
      const next = current.filter((src) => src !== failedSrc);
      if (next.length > 0) return next;
      if (failedSrc !== fallbackSrc) return [fallbackSrc];
      return current;
    });
    setIndex(0);
  };

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((src, slideIndex) => (
        <div
          key={`${src}-${slideIndex}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            slideIndex === index ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={slideIndex !== index}
        >
          <SafeImage
            src={src}
            alt={`${alt} ${slideIndex + 1}`}
            fill
            priority={priority && slideIndex === 0}
            sizes={sizes}
            fallbackSrc={fallbackSrc}
            className={cn("object-cover", imageClassName)}
            onError={() => markFailed(src)}
          />
        </div>
      ))}

      {showDots && slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, slideIndex) => (
            <button
              key={slideIndex}
              type="button"
              aria-label={`Go to slide ${slideIndex + 1}`}
              onClick={() => setIndex(slideIndex)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                slideIndex === index
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
