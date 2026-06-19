"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/customer/page-hero";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { HotelCard } from "@/components/customer/hotel-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import { Label } from "@/components/ui/label";
import {
  HOTEL_SORT_KEYS,
  sortHotels,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { Hotel } from "@/types";

const STAR_OPTIONS = [
  { id: "3", label: "3+ Stars" },
  { id: "4", label: "4+ Stars" },
  { id: "5", label: "5 Stars" },
];

export default function HotelsClient({
  initialHotels,
}: {
  initialHotels: Hotel[];
}) {
  const { locale, searchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [minStars, setMinStars] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  useEffect(() => {
    if (searchFilters.searchTab === "hotels") {
      if (searchFilters.query || searchFilters.location) {
        setQuery(searchFilters.query ?? searchFilters.location ?? "");
      }
    }
  }, [searchFilters]);

  const maxPrice = useMemo(
    () => Math.max(...initialHotels.map((h) => h.priceFrom), 20000),
    [initialHotels]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const clearFilters = () => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setMinStars([]);
  };

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    categories: STAR_OPTIONS,
    selectedCategories: minStars,
    onCategoryToggle: (id: string) =>
      setMinStars((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [id]
      ),
    onClear: clearFilters,
    extraFilters: (
      <div className="space-y-2">
        <Label>Popular Cities</Label>
        {["Delhi", "Goa", "Udaipur"].map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setQuery(city)}
            className="block text-sm text-primary hover:underline"
          >
            {city}
          </button>
        ))}
      </div>
    ),
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (minStars.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, minStars]);

  const filtered = useMemo(() => {
    const starMin =
      minStars.length > 0 ? Math.min(...minStars.map(Number)) : 0;
    return initialHotels.filter((h) => {
      const matchQuery =
        !query ||
        h.name.en.toLowerCase().includes(query.toLowerCase()) ||
        h.city.toLowerCase().includes(query.toLowerCase());
      const matchPrice =
        h.priceFrom >= priceRange[0] && h.priceFrom <= priceRange[1];
      const matchStars = starMin === 0 || h.starRating >= starMin;
      return matchQuery && matchPrice && matchStars;
    });
  }, [initialHotels, query, priceRange, minStars]);

  const sorted = useMemo(
    () => sortHotels(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <>
      <PageHero
        title="Hotels"
        subtitle="Handpicked stays from budget-friendly to luxury resorts"
        image={HERO_IMAGES.hotels}
        compactOnMobile
      />
      <section className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search city or hotel..." />
        </div>
        <ListingLayout
          filterSidebar={<FilterSidebar {...filterProps} />}
          mobileFilterPanel={<FilterSidebar {...filterProps} embedded />}
          sortKeys={HOTEL_SORT_KEYS}
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
              {sorted.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
              ))}
            </div>
          )}
        </ListingLayout>
      </section>
    </>
  );
}
