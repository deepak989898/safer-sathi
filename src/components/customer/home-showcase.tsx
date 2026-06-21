"use client";

import { useState } from "react";
import Link from "next/link";
import { HeroSlider } from "@/components/customer/hero-slider";
import { HomeFeaturesSection } from "@/components/customer/home-features-section";
import { HotelCard } from "@/components/customer/hotel-card";
import {
  MobileHomeHero,
  MobileShowcaseHeader,
  MobileShowcaseTabs,
} from "@/components/customer/mobile-home-hero";
import { MobileShowcaseCard } from "@/components/customer/mobile-showcase-card";
import { PackageCard } from "@/components/customer/package-card";
import { SearchWidget } from "@/components/customer/search-widget";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { Button } from "@/components/ui/button";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { localizedText, t } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { Hotel, TourPackage, Vehicle } from "@/types";

type ShowcaseTab = "packages" | "vehicles" | "hotels";

interface HomeHeroProps {
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
}

const MOBILE_SECTION_COPY: Record<
  ShowcaseTab,
  { title: string; href: string }
> = {
  packages: { title: "Handpicked destinations", href: "/packages" },
  hotels: { title: "Popular stays", href: "/hotels" },
  vehicles: { title: "Premium rides", href: "/vehicles" },
};

export function HomeShowcase({
  featuredPackages,
  featuredHotels,
  featuredVehicles,
}: HomeHeroProps) {
  const { locale } = useAppStore();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<ShowcaseTab>("packages");

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title: t(locale, "hero", "title"),
    subtitle: t(locale, "hero", "subtitle"),
  }));

  const mobileSection = MOBILE_SECTION_COPY[mobileTab];

  return (
    <>
      <MobileHomeHero />

      <div className="hidden md:block">
        <HeroSlider slides={heroSlides} compact={!searchExpanded}>
          <SearchWidget onExpandChange={setSearchExpanded} />
        </HeroSlider>
      </div>

      <section className="bg-background py-6 md:hidden">
        <div className="container mx-auto px-4">
          <MobileShowcaseTabs activeTab={mobileTab} onChange={setMobileTab} />

          <div className="mt-5">
            <MobileShowcaseHeader title={mobileSection.title} href={mobileSection.href} />

            <div className="mobile-showcase-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {mobileTab === "packages" &&
                featuredPackages.map((pkg) => (
                  <MobileShowcaseCard
                    key={pkg.id}
                    href={`/packages/${pkg.slug}`}
                    image={pkg.images[0] ?? ""}
                    title={pkg.cities[0] ?? localizedText(pkg.title, locale)}
                    subtitle={localizedText(pkg.durationLabel, locale)}
                    price={pkg.price}
                    locale={locale}
                  />
                ))}

              {mobileTab === "hotels" &&
                featuredHotels.map((hotel) => (
                  <MobileShowcaseCard
                    key={hotel.id}
                    href={`/hotels/${hotel.slug}`}
                    image={hotel.images[0] ?? ""}
                    title={hotel.city || hotel.location}
                    subtitle={`${hotel.starRating} Star · per night`}
                    price={hotel.priceFrom}
                    locale={locale}
                  />
                ))}

              {mobileTab === "vehicles" &&
                featuredVehicles.map((vehicle) => (
                  <MobileShowcaseCard
                    key={vehicle.id}
                    href={`/vehicles/${vehicle.id}`}
                    image={vehicle.images[0] ?? ""}
                    title={vehicle.location}
                    subtitle={localizedText(vehicle.name, locale)}
                    price={vehicle.pricePerDay}
                    locale={locale}
                  />
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="hidden bg-muted/50 py-16 md:block">
        <div className="container mx-auto px-4">
          <ShowcaseHeader
            title="Featured Packages"
            subtitle="Handpicked destinations loved by thousands of travelers"
            href="/packages"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPackages.map((pkg) => (
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
            {featuredHotels.map((hotel) => (
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
            {featuredVehicles.map((vehicle) => (
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
