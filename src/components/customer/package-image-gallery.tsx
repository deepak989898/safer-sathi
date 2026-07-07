"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { PLACEHOLDER_TRAVEL_IMAGE } from "@/lib/media/travel-images";
import { cn } from "@/lib/utils";

interface PackageImageGalleryProps {
  images: string[];
  alt: string;
  className?: string;
  /** Compact height for hotel detail pages */
  compact?: boolean;
}

const hideScrollbarClass =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function PackageImageGallery({ images, alt, className, compact = false }: PackageImageGalleryProps) {
  const slides = useMemo(
    () => (images.length > 0 ? images : [PLACEHOLDER_TRAVEL_IMAGE]),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      setActiveIndex(clamped);
    },
    [slides.length]
  );

  const handleScroll = useCallback(() => {
    if (scrollRaf.current != null) {
      cancelAnimationFrame(scrollRaf.current);
    }
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el || el.clientWidth === 0) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)));
    });
  }, [slides.length]);

  useEffect(() => {
    const container = thumbRef.current;
    const thumb = container?.children[activeIndex] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  useEffect(() => {
    const onResize = () => scrollToIndex(activeIndex, "auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  const hasMultiple = slides.length > 1;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-muted shadow-sm",
          compact ? "h-[240px] sm:h-[320px] lg:h-[360px]" : "aspect-[16/10]"
        )}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x",
            hideScrollbarClass
          )}
          aria-label={`${alt} photo gallery`}
          role="region"
        >
          {slides.map((src, index) => (
            <div
              key={`slide-${index}-${src}`}
              className="relative h-full min-w-full shrink-0 snap-center snap-always"
            >
              <SafeImage
                src={src}
                alt={`${alt} — photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 60vw, 100vw"
                priority={index === 0}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {hasMultiple && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
              onClick={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
              onClick={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex === slides.length - 1}
              aria-label="Next photo"
            >
              <ChevronRight className="size-5" />
            </Button>
            <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">
              {activeIndex + 1} / {slides.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          ref={thumbRef}
          className={cn(
            "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x",
            hideScrollbarClass
          )}
        >
          {slides.map((src, index) => (
            <button
              key={`thumb-${index}-${src}`}
              type="button"
              onClick={() => scrollToIndex(index)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-[4.5rem] sm:w-28",
                activeIndex === index
                  ? "border-primary ring-1 ring-primary/25"
                  : "border-transparent opacity-80 hover:border-primary/35 hover:opacity-100"
              )}
              aria-label={`View photo ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
            >
              <SafeImage
                src={src}
                alt={`${alt} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="112px"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
