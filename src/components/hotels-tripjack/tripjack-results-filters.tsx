"use client";

import { useMemo } from "react";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const STAR_OPTIONS = [
  { id: "3", label: "3+ Stars" },
  { id: "4", label: "4+ Stars" },
  { id: "5", label: "5 Stars" },
];

export interface TripJackResultsFilterState {
  nameQuery: string;
  priceRange: [number, number];
  selectedCities: string[];
  minStars: string[];
  refundableOnly: boolean;
  breakfastOnly: boolean;
}

interface TripJackResultsFiltersProps {
  maxPrice: number;
  cityOptions: { id: string; label: string }[];
  filters: TripJackResultsFilterState;
  onNameQueryChange: (value: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onCityToggle: (cityId: string) => void;
  onStarToggle: (starId: string) => void;
  onRefundableChange: (value: boolean) => void;
  onBreakfastChange: (value: boolean) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  embedded?: boolean;
}

export function TripJackResultsFilters({
  maxPrice,
  cityOptions,
  filters,
  onNameQueryChange,
  onPriceChange,
  onCityToggle,
  onStarToggle,
  onRefundableChange,
  onBreakfastChange,
  onClear,
  hasActiveFilters,
  embedded,
}: TripJackResultsFiltersProps) {
  const extraFilters = useMemo(
    () => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Hotel name</Label>
          <SearchInput
            value={filters.nameQuery}
            onChange={onNameQueryChange}
            placeholder="Search hotel name..."
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Star rating</p>
          <div className="space-y-2">
            {STAR_OPTIONS.map((star) => (
              <label key={star.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={filters.minStars.includes(star.id)}
                  onCheckedChange={() => onStarToggle(star.id)}
                />
                {star.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={filters.refundableOnly}
              onCheckedChange={(checked) => onRefundableChange(checked === true)}
            />
            Refundable only
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={filters.breakfastOnly}
              onCheckedChange={(checked) => onBreakfastChange(checked === true)}
            />
            Breakfast included
          </label>
        </div>
      </div>
    ),
    [
      filters.nameQuery,
      filters.minStars,
      filters.refundableOnly,
      filters.breakfastOnly,
      onNameQueryChange,
      onStarToggle,
      onRefundableChange,
      onBreakfastChange,
    ]
  );

  return (
    <FilterSidebar
      embedded={embedded}
      priceRange={filters.priceRange}
      maxPrice={maxPrice}
      onPriceChange={onPriceChange}
      placeOptions={cityOptions}
      selectedPlaces={filters.selectedCities}
      onPlaceToggle={onCityToggle}
      placeLabel="City"
      onClear={onClear}
      hasActiveFilters={hasActiveFilters}
      extraFilters={extraFilters}
    />
  );
}

export function extractCityFromLocation(location?: string): string {
  if (!location) return "";
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1] ?? parts[0];
}
