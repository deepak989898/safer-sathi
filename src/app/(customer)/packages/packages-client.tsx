"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { PackageCard } from "@/components/customer/package-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import {
  budgetTierOptions,
  priceMatchesBudgetTiers,
  toggleFilterId,
  type BudgetTierId,
} from "@/lib/catalog/budget-filters";
import { buildCityCounts, filterByCities, normalizeCityKey } from "@/lib/admin/city-filter";
import {
  PACKAGE_SORT_KEYS,
  sortPackages,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
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
  const { locale, searchFilters, resetSearchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetTierId[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  useEffect(() => {
    if (searchFilters.searchTab === "packages") {
      if (searchFilters.query) setQuery(searchFilters.query);
      if (searchFilters.packageCategory) {
        setSelectedCategories([searchFilters.packageCategory]);
      }
      if (searchFilters.query?.trim()) {
        const q = normalizeCityKey(searchFilters.query);
        const match = buildCityCounts(initialPackages, (p) => p.cities ?? []).find(
          (c) => normalizeCityKey(c.label) === q || c.key === q
        );
        if (match) {
          setSelectedPlaces([match.key]);
        }
      }
    }
  }, [searchFilters, initialPackages]);

  const placeOptions = useMemo(
    () =>
      buildCityCounts(initialPackages, (p) => p.cities ?? []).map((city) => ({
        id: city.key,
        label: `${city.label} (${city.count})`,
      })),
    [initialPackages]
  );

  const maxPrice = useMemo(
    () => Math.max(...initialPackages.map((p) => p.price), 50000),
    [initialPackages]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setSelectedCategories([]);
    setSelectedPlaces([]);
    setSelectedBudget([]);
    setSortBy("price_asc");
    resetSearchFilters();
  }, [maxPrice, resetSearchFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedPlaces.length > 0) count++;
    if (selectedBudget.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, selectedCategories, selectedPlaces, selectedBudget]);

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    budgetOptions: budgetTierOptions(locale),
    selectedBudget,
    onBudgetToggle: (id: string) =>
      setSelectedBudget((prev) => toggleFilterId(prev, id) as BudgetTierId[]),
    budgetLabel: locale === "hi" ? "बजट श्रेणी" : "Budget Category",
    categories: CATEGORIES,
    selectedCategories,
    onCategoryToggle: (id: string) =>
      setSelectedCategories((prev) => toggleFilterId(prev, id)),
    categoryLabel: locale === "hi" ? "पैकेज श्रेणी" : "Package Category",
    placeOptions,
    selectedPlaces,
    onPlaceToggle: (id: string) =>
      setSelectedPlaces((prev) => toggleFilterId(prev, id)),
    placeLabel: locale === "hi" ? "शहर / टूर स्थान" : "City / Tour Places",
    onClear: clearFilters,
    hasActiveFilters: activeFilterCount > 0,
  };

  const filtered = useMemo(() => {
    const byCity = filterByCities(initialPackages, selectedPlaces, (p) => p.cities ?? []);
    return byCity.filter((p) => {
      const matchQuery =
        !query ||
        p.title.en.toLowerCase().includes(query.toLowerCase()) ||
        p.cities.some((c) => c.toLowerCase().includes(query.toLowerCase()));
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchCat =
        selectedCategories.length === 0 ||
        selectedCategories.includes(p.category);
      const matchBudget = priceMatchesBudgetTiers(p.price, selectedBudget, maxPrice);
      return matchQuery && matchPrice && matchCat && matchBudget;
    });
  }, [
    initialPackages,
    query,
    priceRange,
    selectedCategories,
    selectedPlaces,
    selectedBudget,
    maxPrice,
  ]);

  const sorted = useMemo(
    () => sortPackages(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <section className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0c2444] md:text-3xl">
            {locale === "hi" ? "टूर पैकेज" : "Tour Packages"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "hi"
              ? "भारत के सुंदर गंतव्यों के लिए क्यूरेटेड अनुभव"
              : "Curated experiences across India's most beautiful destinations"}
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search destinations..."
          className="w-full md:max-w-sm"
        />
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
  );
}
