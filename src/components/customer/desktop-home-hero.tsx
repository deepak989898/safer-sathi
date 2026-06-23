"use client";

import Link from "next/link";
import { MapPin, PlayCircle, Sparkles } from "lucide-react";
import { HeroSlider } from "@/components/customer/hero-slider";
import { SearchWidget } from "@/components/customer/search-widget";
import { Button } from "@/components/ui/button";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";

export function DesktopHomeHero() {
  const { locale } = useAppStore();

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title:
      locale === "hi"
        ? "आपकी यात्रा, हमारा जुनून"
        : "Your Journey, Our Passion",
    subtitle:
      locale === "hi"
        ? "भारत भर में क्यूरेटेड पैकेज, तुरंत बुकिंग और 24/7 सपोर्ट के साथ अविस्मरणीय यादें बनाएं।"
        : "Discover incredible destinations across India with curated packages, instant booking, and 24/7 support.",
  }));

  return (
    <div className="desktop-hero-stack hidden md:block">
      <div className="relative">
        <HeroSlider
          slides={heroSlides}
          className="min-h-[560px] lg:min-h-[600px]"
          desktopReferenceLayout
        >
          <div className="flex flex-wrap items-center gap-3 pt-2 lg:gap-4">
            <Link href="/packages">
              <Button
                size="lg"
                className="h-11 rounded-full bg-[#f97316] px-7 text-base font-semibold text-white shadow-md hover:bg-[#ea580c]"
              >
                {locale === "hi" ? "पैकेज देखें" : "Explore Packages"}
              </Button>
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4" />
              {locale === "hi" ? "ऑफ़र देखें" : "View Offers"}
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/20"
            >
              <MapPin className="h-4 w-4" />
              {locale === "hi" ? "शहर देखें" : "View Cities"}
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/20"
            >
              <PlayCircle className="h-4 w-4" />
              {locale === "hi" ? "गैलरी" : "Gallery"}
            </Link>
          </div>
        </HeroSlider>

        <div className="desktop-search-bridge pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-auto container mx-auto px-4">
            <SearchWidget variant="desktop-bridge" />
          </div>
        </div>
      </div>
    </div>
  );
}
