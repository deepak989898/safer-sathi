"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/customer/page-hero";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { PackageCard } from "@/components/customer/package-card";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import type { TourPackage } from "@/types";

const CATEGORIES = [
  { id: "domestic", label: "Domestic" },
  { id: "international", label: "International" },
  { id: "religious", label: "Religious" },
  { id: "adventure", label: "Adventure" },
  { id: "family", label: "Family" },
  { id: "honeymoon", label: "Honeymoon" },
];

export default function PackagesClient({
  initialPackages,
}: {
  initialPackages: TourPackage[];
}) {
  const { locale } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const maxPrice = useMemo(
    () => Math.max(...initialPackages.map((p) => p.price), 50000),
    [initialPackages]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const filtered = useMemo(() => {
    return initialPackages.filter((p) => {
      const matchQuery =
        !query ||
        p.title.en.toLowerCase().includes(query.toLowerCase()) ||
        p.cities.some((c) => c.toLowerCase().includes(query.toLowerCase()));
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchCat =
        selectedCategories.length === 0 ||
        selectedCategories.includes(p.category);
      return matchQuery && matchPrice && matchCat;
    });
  }, [initialPackages, query, priceRange, selectedCategories]);

  return (
    <>
      <PageHero
        title="Tour Packages"
        subtitle="Curated experiences across India's most beautiful destinations"
        image="https://images.unsplash.com/photo-1524492412937-280b457d55e8?w=1920&q=80"
      />
      <section className="container mx-auto px-4 py-10">
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search destinations..." />
        </div>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <FilterSidebar
            priceRange={priceRange}
            maxPrice={maxPrice}
            onPriceChange={setPriceRange}
            categories={CATEGORIES}
            selectedCategories={selectedCategories}
            onCategoryToggle={(id) =>
              setSelectedCategories((prev) =>
                prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
              )
            }
            onClear={() => {
              setQuery("");
              setPriceRange([0, maxPrice]);
              setSelectedCategories([]);
            }}
          />
          <div>
            {filtered.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">
                {t(locale, "common", "noResults")}
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
