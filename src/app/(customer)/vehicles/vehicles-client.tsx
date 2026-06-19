"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/customer/page-hero";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import {
  VEHICLE_SORT_KEYS,
  sortVehicles,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { Vehicle } from "@/types";

const TYPE_OPTIONS = [
  { id: "car", label: "Car" },
  { id: "suv", label: "SUV" },
  { id: "luxury", label: "Luxury" },
  { id: "tempo_traveller", label: "Tempo Traveller" },
  { id: "bus", label: "Bus" },
];

export default function VehiclesPage({
  initialVehicles,
}: {
  initialVehicles: Vehicle[];
}) {
  const { locale, searchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  useEffect(() => {
    if (searchFilters.searchTab === "vehicles") {
      if (searchFilters.query || searchFilters.location) {
        setQuery(searchFilters.query ?? searchFilters.location ?? "");
      }
      if (searchFilters.vehicleType) {
        setSelectedTypes([searchFilters.vehicleType]);
      }
    }
  }, [searchFilters]);

  const maxPrice = useMemo(
    () => Math.max(...initialVehicles.map((v) => v.pricePerDay), 20000),
    [initialVehicles]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setSelectedTypes([]);
  };

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    categories: TYPE_OPTIONS,
    selectedCategories: selectedTypes,
    onCategoryToggle: toggleType,
    onClear: clearFilters,
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (selectedTypes.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, selectedTypes]);

  const filtered = useMemo(() => {
    return initialVehicles.filter((v) => {
      const matchQuery =
        !query ||
        v.name.en.toLowerCase().includes(query.toLowerCase()) ||
        v.location.toLowerCase().includes(query.toLowerCase());
      const matchPrice =
        v.pricePerDay >= priceRange[0] && v.pricePerDay <= priceRange[1];
      const matchType =
        selectedTypes.length === 0 || selectedTypes.includes(v.type);
      return matchQuery && matchPrice && matchType;
    });
  }, [initialVehicles, query, priceRange, selectedTypes]);

  const sorted = useMemo(
    () => sortVehicles(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <>
      <PageHero
        title="Vehicles"
        subtitle="Premium cars, SUVs, tempo travellers and buses for every journey"
        image={HERO_IMAGES.vehicles}
        compactOnMobile
      />
      <section className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search vehicles..." />
        </div>
        <ListingLayout
          filterSidebar={<FilterSidebar {...filterProps} />}
          mobileFilterPanel={<FilterSidebar {...filterProps} embedded />}
          sortKeys={VEHICLE_SORT_KEYS}
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
              {sorted.map((v) => (
                <VehicleCard key={v.id} vehicle={v} locale={locale} />
              ))}
            </div>
          )}
        </ListingLayout>
      </section>
    </>
  );
}
