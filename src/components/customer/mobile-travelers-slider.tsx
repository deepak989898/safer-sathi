"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buildHomeTestimonials } from "@/lib/catalog/home-testimonials";
import { useAppStore } from "@/store/app-store";
import type { Review } from "@/types";
import { cn } from "@/lib/utils";

interface MobileTravelersSliderProps {
  reviews: Review[];
}

function TestimonialCard({
  userName,
  rating,
  comment,
  tourLabel,
}: {
  userName: string;
  rating: number;
  comment: string;
  tourLabel: string;
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-2xl border bg-card p-4 shadow-sm",
        "ring-1 ring-black/5"
      )}
    >
      <div className="mb-3 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "h-3.5 w-3.5",
              index < rating
                ? "fill-[#f97316] text-[#f97316]"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
      <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-[#334155]">
        &ldquo;{comment}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-2.5 border-t border-border/60 pt-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0c2444]">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{tourLabel}</p>
        </div>
      </div>
    </article>
  );
}

export function MobileTravelersSlider({ reviews }: MobileTravelersSliderProps) {
  const { locale } = useAppStore();
  const testimonials = buildHomeTestimonials(reviews, locale, 20);

  if (testimonials.length === 0) return null;

  const loop = [...testimonials, ...testimonials];

  return (
    <section className="overflow-hidden bg-background py-6 md:hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-lg font-bold text-[#0c2444]">
          {locale === "hi" ? "यात्रियों की राय" : "What Our Travelers Say"}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-center text-xs text-muted-foreground">
          {locale === "hi"
            ? "हज़ारों खुश यात्रियों की वास्तविक प्रतिक्रिया"
            : "Real feedback from thousands of happy travelers"}
        </p>
        <Link
          href="/reviews"
          className="mt-1 block text-center text-xs font-semibold text-primary"
        >
          {locale === "hi" ? "सभी समीक्षाएँ देखें" : "View all reviews"}
        </Link>
      </div>

      <div className="mobile-testimonial-marquee-mask relative mt-4">
        <div
          className="mobile-testimonial-marquee-track flex w-max gap-3 px-4"
          style={{ animationDuration: `${Math.max(testimonials.length * 4, 40)}s` }}
        >
          {loop.map((item, index) => (
            <TestimonialCard
              key={`${item.id}-${index}`}
              userName={item.userName}
              rating={item.rating}
              comment={item.comment}
              tourLabel={item.tourLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
