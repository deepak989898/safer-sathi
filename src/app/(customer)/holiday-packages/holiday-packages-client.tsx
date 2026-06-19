"use client";

import { PageHero } from "@/components/customer/page-hero";
import { PackageCard } from "@/components/customer/package-card";
import { useAppStore } from "@/store/app-store";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { TourPackage } from "@/types";

export default function HolidayPackagesClient({
  initialPackages,
}: {
  initialPackages: TourPackage[];
}) {
  const { locale } = useAppStore();

  return (
    <>
      <PageHero
        title="Holiday Packages"
        subtitle="Family getaways, honeymoons and adventure escapes"
        image={HERO_IMAGES.holidays}
        compactOnMobile
      />
      <section className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {initialPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
          ))}
        </div>
      </section>
    </>
  );
}
