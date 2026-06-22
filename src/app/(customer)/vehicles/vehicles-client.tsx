"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { VehicleCard } from "@/components/customer/vehicle-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import { Checkbox } from "@/components/ui/checkbox";
import {
  budgetTierOptions,
  priceMatchesBudgetTiers,
  toggleFilterId,
  type BudgetTierId,
} from "@/lib/catalog/budget-filters";
import {
  VEHICLE_SORT_KEYS,
  sortVehicles,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import type { Vehicle } from "@/types";

const TYPE_OPTIONS = [
  { id: "car", label: "Car" },
  { id: "suv", label: "SUV" },
  { id: "luxury", label: "Luxury" },
  { id: "tempo_traveller", label: "Tempo Traveller" },
  { id: "bus", label: "Bus" },
];

const SEAT_OPTIONS = [
  { id: "4", label: "Up to 4 seats" },
  { id: "7", label: "5–7 seats" },
  { id: "12", label: "8–12 seats" },
  { id: "20", label: "13+ seats" },
];

function matchesSeatFilter(vehicle: Vehicle, seatFilters: string[]): boolean {
  if (seatFilters.length === 0) return true;
  return seatFilters.some((filter) => {
    const seats = vehicle.seats;
    switch (filter) {
      case "4":
        return seats <= 4;
      case "7":
        return seats >= 5 && seats <= 7;
      case "12":
        return seats >= 8 && seats <= 12;
      case "20":
        return seats >= 13;
      default:
        return true;
    }
  });
}

export default function VehiclesPage({
  initialVehicles,
}: {
  initialVehicles: Vehicle[];
}) {
  const { locale, searchFilters, resetSearchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetTierId[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
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

  const clearFilters = useCallback(() => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setSelectedTypes([]);
    setSelectedBudget([]);
    setSelectedSeats([]);
    setSortBy("price_asc");
    resetSearchFilters();
  }, [maxPrice, resetSearchFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (selectedTypes.length > 0) count++;
    if (selectedBudget.length > 0) count++;
    if (selectedSeats.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, selectedTypes, selectedBudget, selectedSeats]);

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    budgetOptions: budgetTierOptions(locale),
    selectedBudget,
    onBudgetToggle: (id: string) =>
      setSelectedBudget((prev) => toggleFilterId(prev, id) as BudgetTierId[]),
    budgetLabel: locale === "hi" ? "बजट श्रेणी" : "Budget Category",
    categories: TYPE_OPTIONS,
    selectedCategories: selectedTypes,
    onCategoryToggle: (id: string) =>
      setSelectedTypes((prev) => toggleFilterId(prev, id)),
    categoryLabel: locale === "hi" ? "वाहन प्रकार" : "Vehicle Type",
    onClear: clearFilters,
    hasActiveFilters: activeFilterCount > 0,
    extraFilters: (
      <div className="space-y-3">
        <p className="text-sm font-medium">{locale === "hi" ? "सीट क्षमता" : "Seating Capacity"}</p>
        <div className="space-y-2">
          {SEAT_OPTIONS.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={selectedSeats.includes(option.id)}
                onCheckedChange={() =>
                  setSelectedSeats((prev) => toggleFilterId(prev, option.id))
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    ),
  };

  const filtered = useMemo(() => {
    return initialVehicles.filter((v) => {
      const matchQuery =
        !query ||
        v.name.en.toLowerCase().includes(query.toLowerCase()) ||
        v.location.toLowerCase().includes(query.toLowerCase());
      const matchPrice = v.pricePerDay >= priceRange[0] && v.pricePerDay <= priceRange[1];
      const matchType = selectedTypes.length === 0 || selectedTypes.includes(v.type);
      const matchBudget = priceMatchesBudgetTiers(v.pricePerDay, selectedBudget, maxPrice);
      const matchSeats = matchesSeatFilter(v, selectedSeats);
      return matchQuery && matchPrice && matchType && matchBudget && matchSeats;
    });
  }, [initialVehicles, query, priceRange, selectedTypes, selectedBudget, selectedSeats, maxPrice]);

  const sorted = useMemo(
    () => sortVehicles(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <section className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0c2444] md:text-3xl">
            {locale === "hi" ? "वाहन" : "Vehicles"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "hi"
              ? "कार, SUV, टेम्पो और बस — हर यात्रा के लिए"
              : "Premium cars, SUVs, tempo travellers and buses for every journey"}
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search vehicles..."
          className="w-full md:max-w-sm"
        />
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
  );
}
