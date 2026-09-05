"use client";

import { DesktopHomeHero } from "@/components/customer/desktop-home-hero";
import { DesktopHomeSections } from "@/components/customer/desktop-home-sections";
import { MobileHomeShowcase } from "@/components/customer/mobile-home-hero";
import type {
  HomepageHeroSlide,
  MobileShowcaseItem,
  PopularDestinationItem,
} from "@/lib/catalog/homepage-showcase";
import type { Hotel, Review, TourPackage, Vehicle } from "@/types";

interface HomeShowcaseProps {
  heroSlides: HomepageHeroSlide[];
  popularDestinations: PopularDestinationItem[];
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
  mobilePackages: MobileShowcaseItem[];
  mobileHotels: MobileShowcaseItem[];
  mobileVehicles: MobileShowcaseItem[];
  reviews: Review[];
}

export function HomeShowcase({
  heroSlides,
  popularDestinations,
  featuredPackages,
  featuredHotels,
  featuredVehicles,
  mobilePackages,
  mobileHotels,
  mobileVehicles,
  reviews,
}: HomeShowcaseProps) {
  return (
    <>
      <MobileHomeShowcase
        heroSlides={heroSlides}
        mobilePackages={mobilePackages}
        mobileHotels={mobileHotels}
        mobileVehicles={mobileVehicles}
      />

      <DesktopHomeHero heroSlides={heroSlides} />

      <DesktopHomeSections
        popularDestinations={popularDestinations}
        featuredPackages={featuredPackages}
        featuredHotels={featuredHotels}
        featuredVehicles={featuredVehicles}
        reviews={reviews}
      />
    </>
  );
}
