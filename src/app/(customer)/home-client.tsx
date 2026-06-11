"use client";

import { PackageCard } from "@/components/customer/package-card";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import type { TourPackage } from "@/types";

interface HomeClientProps {
  featured?: TourPackage[];
  titleKey?: string;
  descKey?: string;
  mode?: "hero" | "grid" | "feature";
}

export function HomeClient({
  featured,
  titleKey,
  descKey,
  mode = "hero",
}: HomeClientProps) {
  const { locale } = useAppStore();

  if (mode === "hero") {
    return (
      <>
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          {t(locale, "hero", "title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
          {t(locale, "hero", "subtitle")}
        </p>
      </>
    );
  }

  if (mode === "feature" && titleKey && descKey) {
    return (
      <>
        <h3 className="font-semibold">{t(locale, "features", titleKey)}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(locale, "features", descKey)}
        </p>
      </>
    );
  }

  if (mode === "grid" && featured) {
    return (
      <>
        {featured.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
        ))}
      </>
    );
  }

  return null;
}
