"use client";

import { PageHero } from "@/components/customer/page-hero";
import { PackageCard } from "@/components/customer/package-card";
import { useAppStore } from "@/store/app-store";
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
        image="https://images.unsplash.com/photo-1602216057656-f1031b5a934f?w=1920&q=80"
      />
      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {initialPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
          ))}
        </div>
      </section>
    </>
  );
}
