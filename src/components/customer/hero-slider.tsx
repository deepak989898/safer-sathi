"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  image: string;
  title?: string;
  subtitle?: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  interval?: number;
  children?: React.ReactNode;
  className?: string;
  /** Shorter hero on mobile when search is collapsed */
  compact?: boolean;
  /** Left-aligned serif title, lighter overlay — mobile reference layout */
  mobileReferenceLayout?: boolean;
}

export function HeroSlider({
  slides,
  interval = 5000,
  children,
  className,
  compact = false,
  mobileReferenceLayout = false,
}: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const activeSlide = slides[index] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [slides.length, interval]);

  if (!activeSlide) return null;

  return (
    <section
      className={cn(
        "relative flex items-center justify-center overflow-hidden md:min-h-[580px]",
        compact ? "min-h-[420px] sm:min-h-[480px]" : "min-h-[520px] sm:min-h-[560px]",
        className
      )}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.image}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            slideIndex === index ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={slideIndex !== index}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${slide.image})` }}
          />
          <div
            className={cn(
              "absolute inset-0",
              mobileReferenceLayout ? "hero-slider-overlay-reference" : "hero-slider-overlay"
            )}
          />
        </div>
      ))}

      <div
        className={cn(
          "container relative z-10 mx-auto px-4 py-10 md:py-20",
          mobileReferenceLayout
            ? "flex min-h-0 flex-col justify-start pt-24 text-left sm:pt-28"
            : "text-center"
        )}
      >
        {activeSlide.title && (
          <h1
            className={cn(
              mobileReferenceLayout
                ? "max-w-[15rem] font-serif text-[1.65rem] font-bold leading-[1.12] tracking-tight text-[#0f172a] sm:max-w-md sm:text-4xl"
                : "text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-4xl md:text-5xl lg:text-6xl"
            )}
          >
            {activeSlide.title}
          </h1>
        )}
        {activeSlide.subtitle && !mobileReferenceLayout && (
          <p className="mx-auto mt-3 max-w-2xl text-base text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:mt-4 sm:text-lg md:text-white/95">
            {activeSlide.subtitle}
          </p>
        )}
        {children && (
          <div className={cn("mt-5 md:mt-10", mobileReferenceLayout && "mt-4 w-full")}>
            {children}
          </div>
        )}
      </div>

      {slides.length > 1 && !mobileReferenceLayout && (
        <>
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.image}
                type="button"
                aria-label={`Go to hero slide ${slideIndex + 1}`}
                onClick={() => setIndex(slideIndex)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  slideIndex === index
                    ? "w-8 bg-white"
                    : "w-2 bg-white/45 hover:bg-white/70"
                )}
              />
            ))}
          </div>

          <div className="absolute bottom-6 right-6 z-10 hidden rounded-full bg-black/25 px-3 py-1 text-xs text-white/90 backdrop-blur sm:block">
            {index + 1} / {slides.length}
          </div>
        </>
      )}
    </section>
  );
}
