"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/customer/page-hero";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { PackageCard } from "@/components/customer/package-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import {
  PACKAGE_SORT_KEYS,
  sortPackages,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
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
  const { locale, searchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  useEffect(() => {
    if (searchFilters.searchTab === "packages" || searchFilters.searchTab === "flights") {
      if (searchFilters.query) setQuery(searchFilters.query);
      if (searchFilters.packageCategory) {
        setSelectedCategories([searchFilters.packageCategory]);
      }
    }
  }, [searchFilters]);

  const maxPrice = useMemo(
    () => Math.max(...initialPackages.map((p) => p.price), 50000),
    [initialPackages]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const clearFilters = () => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setSelectedCategories([]);
  };

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    categories: CATEGORIES,
    selectedCategories: selectedCategories,
    onCategoryToggle: (id: string) =>
      setSelectedCategories((prev) =>
        prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
      ),
    onClear: clearFilters,
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (selectedCategories.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, selectedCategories]);

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

  const sorted = useMemo(
    () => sortPackages(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <>
      <PageHero
        title="Tour Packages"
        subtitle="Curated experiences across India's most beautiful destinations"
        image={HERO_IMAGES.packages}
        compactOnMobile
      />
      <section className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search destinations..." />
        </div>
        <ListingLayout
          filterSidebar={<FilterSidebar {...filterProps} />}
          mobileFilterPanel={<FilterSidebar {...filterProps} embedded />}
          sortKeys={PACKAGE_SORT_KEYS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          activeFilterCount={activeFilterCount}
          resultCount={sorted.length}
        >
          {sorted.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">
              {t(locale, "common", "noResults")}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
              ))}
            </div>
          )}
        </ListingLayout>
      </section>
    </>
  );
}
