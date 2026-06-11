"use client";

import Link from "next/link";
import { HeroSlider } from "@/components/customer/hero-slider";
import { HotelCard } from "@/components/customer/hotel-card";
import { PackageCard } from "@/components/customer/package-card";
import { SearchWidget } from "@/components/customer/search-widget";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { Button } from "@/components/ui/button";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import type { Hotel, TourPackage, Vehicle } from "@/types";

interface HomeHeroProps {
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
}

export function HomeShowcase({
  featuredPackages,
  featuredHotels,
  featuredVehicles,
}: HomeHeroProps) {
  const { locale } = useAppStore();

  const heroSlides = HOME_HERO_SLIDES.map((slide) => ({
    image: slide.image,
    title: t(locale, "hero", "title"),
    subtitle: t(locale, "hero", "subtitle"),
  }));

  return (
    <>
      <HeroSlider slides={heroSlides}>
        <SearchWidget />
      </HeroSlider>

      <section className="bg-muted/50 py-16">
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

      <section className="py-16">
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

      <section className="bg-muted/50 py-16">
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
