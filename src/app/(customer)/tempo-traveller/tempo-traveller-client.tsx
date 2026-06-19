"use client";

import { PageHero } from "@/components/customer/page-hero";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { Vehicle } from "@/types";

export default function TempoTravellerClient({
  initialVehicles,
}: {
  initialVehicles: Vehicle[];
}) {
  const { locale } = useAppStore();

  return (
    <>
      <PageHero
        title="Tempo Traveller"
        subtitle="Spacious group travel for tours, pilgrimages and corporate trips"
        image={HERO_IMAGES.tempo}
        compactOnMobile
      />
      <section className="container mx-auto px-4 py-6 md:py-10">
        {initialVehicles.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            {t(locale, "common", "noResults")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {initialVehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
