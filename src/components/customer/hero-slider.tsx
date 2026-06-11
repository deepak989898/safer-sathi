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
}

export function HeroSlider({
  slides,
  interval = 5000,
  children,
  className,
  compact = false,
}: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = slides[index] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1 || paused) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [slides.length, interval, paused]);

  if (!activeSlide) return null;

  return (
    <section
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        "relative flex items-center justify-center overflow-hidden md:min-h-[560px]",
        compact ? "min-h-[340px] sm:min-h-[400px]" : "min-h-[480px] sm:min-h-[520px]",
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.image}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out",
            slideIndex === index ? "opacity-100" : "opacity-0"
          )}
          style={{
            backgroundImage: `linear-gradient(135deg, oklch(0.22 0.08 264 / 0.88), oklch(0.52 0.19 264 / 0.65)), url(${slide.image})`,
          }}
          aria-hidden={slideIndex !== index}
        />
      ))}

      <div className="container relative z-10 mx-auto px-4 py-10 text-center md:py-20">
        {activeSlide.title && (
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {activeSlide.title}
          </h1>
        )}
        {activeSlide.subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/90 sm:mt-4 sm:text-lg">
            {activeSlide.subtitle}
          </p>
        )}
        {children && <div className="mt-5 md:mt-10">{children}</div>}
      </div>

      {slides.length > 1 && (
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
