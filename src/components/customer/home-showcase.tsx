"use client";

import { useState } from "react";
import Link from "next/link";
import { HeroSlider } from "@/components/customer/hero-slider";
import { HomeFeaturesSection } from "@/components/customer/home-features-section";
import { HotelCard } from "@/components/customer/hotel-card";
import { PackageCard } from "@/components/customer/package-card";
import { SearchWidget } from "@/components/customer/search-widget";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { Button } from "@/components/ui/button";
import { HOME_HERO_SLIDES } from "@/lib/media/travel-images";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Hotel, TourPackage, Vehicle } from "@/types";

type ShowcaseTab = "packages" | "vehicles" | "hotels";

interface HomeHeroProps {
  featuredPackages: TourPackage[];
  featuredHotels: Hotel[];
  featuredVehicles: Vehicle[];
}

const MOBILE_TABS: { id: ShowcaseTab; labelKey: string; href: string }[] = [
  { id: "packages", labelKey: "packages", href: "/packages" },
  { id: "vehicles", labelKey: "vehicles", href: "/vehicles" },
  { id: "hotels", labelKey: "hotels", href: "/hotels" },
];

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

  const mobileConfig = {
    packages: {
      title: "Featured Packages",
      subtitle: "Handpicked destinations loved by thousands of travelers",
      href: "/packages",
      items: featuredPackages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
      )),
    },
    hotels: {
      title: "Popular Hotels",
      subtitle: "Luxury stays and scenic resorts across India",
      href: "/hotels",
      items: featuredHotels.map((hotel) => (
        <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
      )),
    },
    vehicles: {
      title: "Premium Vehicles",
      subtitle: "Comfortable rides for every journey — cars, SUVs, tempo & buses",
      href: "/vehicles",
      items: featuredVehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} locale={locale} />
      )),
    },
  } as const;

  const activeMobile = mobileConfig[mobileTab];

  return (
    <>
      <HeroSlider slides={heroSlides} compact={!searchExpanded}>
        <SearchWidget onExpandChange={setSearchExpanded} />
      </HeroSlider>

      <HomeFeaturesSection />

      {/* Mobile: tabbed showcase */}
      <section className="bg-muted/50 py-10 md:hidden">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex rounded-xl border bg-background p-1">
            {MOBILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileTab(tab.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors sm:text-sm",
                  mobileTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(locale, "nav", tab.labelKey)}
              </button>
            ))}
          </div>
          <ShowcaseHeader
            title={activeMobile.title}
            subtitle={activeMobile.subtitle}
            href={activeMobile.href}
          />
          <div className="grid gap-6">{activeMobile.items}</div>
        </div>
      </section>

      {/* Desktop: separate sections */}
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
