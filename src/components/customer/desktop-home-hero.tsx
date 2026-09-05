"use client";

import Link from "next/link";
import { HeroSlider } from "@/components/customer/hero-slider";
import { SearchWidget } from "@/components/customer/search-widget";
import { Button } from "@/components/ui/button";
import type { HomepageHeroSlide } from "@/lib/catalog/homepage-showcase";
import { localizedText } from "@/lib/i18n";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";

export function DesktopHomeHero({
  heroSlides = [],
}: {
  heroSlides?: HomepageHeroSlide[];
}) {
  const { locale } = useAppStore();

  const source: HomepageHeroSlide[] =
    heroSlides.length > 0
      ? heroSlides
      : HOME_HERO_SLIDES.map((slide) => ({ image: slide.image }));

  const slides = source.map((slide) => {
    const packageSlug = slide.packageSlug;
    const packageTitle = slide.packageTitle
      ? localizedText(slide.packageTitle, locale).trim()
      : "";

    return {
      image: slide.image,
      title:
        locale === "hi"
          ? "आपकी यात्रा, हमारा जुनून"
          : "Your Journey, Our Passion",
      subtitle: packageTitle || undefined,
      packageSlug,
      href: packageSlug ? `/packages/${packageSlug}` : "/packages",
    };
  });

  return (
    <div className="desktop-hero-stack hidden md:block">
      <div className="relative">
        <HeroSlider
          slides={slides}
          className="min-h-[560px] lg:min-h-[600px]"
          desktopReferenceLayout
        >
          {(activeSlide) => (
            <div className="flex flex-wrap items-center gap-3 pt-2 lg:gap-4">
              <Link href={activeSlide.href || "/packages"}>
                <Button
                  size="lg"
                  className="h-11 rounded-full bg-[#f97316] px-7 text-base font-semibold text-white shadow-md hover:bg-[#ea580c]"
                >
                  {locale === "hi" ? "पैकेज देखें" : "Explore Package"}
                </Button>
              </Link>
            </div>
          )}
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
