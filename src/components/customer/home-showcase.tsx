"use client";

import { useState } from "react";
import Link from "next/link";
import { HeroSlider } from "@/components/customer/hero-slider";
import { HomeFeaturesSection } from "@/components/customer/home-features-section";
import { HotelCard } from "@/components/customer/hotel-card";
import { MobileHomeShowcase } from "@/components/customer/mobile-home-hero";
import { PackageCard } from "@/components/customer/package-card";
import { SearchWidget } from "@/components/customer/search-widget";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { Button } from "@/components/ui/button";
import type { MobileShowcaseItem } from "@/lib/catalog/homepage-showcase";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { Hotel, TourPackage, Vehicle } from "@/types";

interface HomeHeroProps {
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
  mobilePackages: MobileShowcaseItem[];
  mobileHotels: MobileShowcaseItem[];
  mobileVehicles: MobileShowcaseItem[];
}

export function HomeShowcase({
  featuredPackages,
  featuredHotels,
  featuredVehicles,
  mobilePackages,
  mobileHotels,
  mobileVehicles,
}: HomeHeroProps) {
  const { locale } = useAppStore();
  const [searchExpanded, setSearchExpanded] = useState(false);

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title: t(locale, "hero", "title"),
    subtitle: t(locale, "hero", "subtitle"),
  }));

  return (
    <>
      <MobileHomeShowcase
        mobilePackages={mobilePackages}
        mobileHotels={mobileHotels}
        mobileVehicles={mobileVehicles}
      />

      <div className="hidden md:block">
        <HeroSlider slides={heroSlides} compact={!searchExpanded}>
          <SearchWidget onExpandChange={setSearchExpanded} />
        </HeroSlider>
      </div>

      <section className="hidden bg-muted/50 py-16 md:block">
        <div className="container mx-auto px-4">
          <ShowcaseHeader
            title="Featured Packages"
            subtitle="Handpicked destinations loved by thousands of travelers"
            href="/packages"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPackages.slice(0, 3).map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <section className="hidden py-16 md:block">
        <div className="container mx-auto px-4">
          <ShowcaseHeader
            title="Popular Hotels"
            subtitle="Luxury stays and scenic resorts across India"
            href="/hotels"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredHotels.slice(0, 3).map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <section className="hidden bg-muted/50 py-16 md:block">
        <div className="container mx-auto px-4">
          <ShowcaseHeader
            title="Premium Vehicles"
            subtitle="Comfortable rides for every journey — cars, SUVs, tempo & buses"
            href="/vehicles"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredVehicles.slice(0, 3).map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <HomeFeaturesSection />
      </div>
    </>
  );
}

function ShowcaseHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-primary md:text-3xl">{title}</h2>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      <Link href={href}>
        <Button variant="outline">View All</Button>
      </Link>
    </div>
  );
}
