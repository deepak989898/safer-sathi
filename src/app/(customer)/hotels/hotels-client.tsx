"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { HotelCard } from "@/components/customer/hotel-card";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import { Checkbox } from "@/components/ui/checkbox";
import {
  budgetTierOptions,
  priceMatchesBudgetTiers,
  toggleFilterId,
  type BudgetTierId,
} from "@/lib/catalog/budget-filters";
import {
  HOTEL_SORT_KEYS,
  sortHotels,
  type CatalogSortKey,
} from "@/lib/catalog/sort";
import { getEffectiveHotelPriceFrom } from "@/lib/catalog/hotel-pricing";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { FeaturedTripJackHotelsSection } from "@/components/hotels-tripjack/featured-tripjack-hotels";
import type { FeaturedTripJackCatalogInfo } from "@/components/hotels-tripjack/featured-tripjack-hotels";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";
import type { Hotel } from "@/types";

const STAR_OPTIONS = [
  { id: "3", label: "3+ Stars" },
  { id: "4", label: "4+ Stars" },
  { id: "5", label: "5 Stars" },
];

const STAY_CATEGORIES = [
  { id: "resort", label: "Resort & Spa" },
  { id: "heritage", label: "Heritage & Palace" },
  { id: "business", label: "Business Hotel" },
  { id: "beach", label: "Beach & Leisure" },
];

function matchesStayCategory(hotel: Hotel, categories: string[]): boolean {
  if (categories.length === 0) return true;
  const name = hotel.name.en.toLowerCase();
  const amenities = hotel.amenities.map((a) => a.toLowerCase());
  return categories.some((cat) => {
    switch (cat) {
      case "resort":
        return (
          amenities.some((a) => a.includes("pool") || a.includes("spa")) ||
          name.includes("resort")
        );
      case "heritage":
        return /palace|heritage|fort|haveli/.test(name);
      case "business":
        return amenities.some((a) => a.includes("gym")) || name.includes("business");
      case "beach":
        return (
          hotel.city.toLowerCase() === "goa" ||
          name.includes("beach") ||
          amenities.some((a) => a.includes("pool"))
        );
      default:
        return false;
    }
  });
}

export default function HotelsClient({
  initialHotels,
  featuredTripJackHotels = [],
  tripjackHotelsEnabled = true,
  manualHotelsEnabled = true,
}: {
  initialHotels: Hotel[];
  featuredTripJackHotels?: FeaturedTripJackHotelCard[];
  tripjackHotelsEnabled?: boolean;
  manualHotelsEnabled?: boolean;
}) {
  const { locale, searchFilters, resetSearchFilters } = useAppStore();
  const [featuredHotels, setFeaturedHotels] = useState(featuredTripJackHotels);
  const [featuredCatalogInfo, setFeaturedCatalogInfo] = useState<FeaturedTripJackCatalogInfo | null>(
    null
  );
  const [featuredLoading, setFeaturedLoading] = useState(tripjackHotelsEnabled);
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [minStars, setMinStars] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetTierId[]>([]);
  const [selectedStayTypes, setSelectedStayTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("price_asc");

  useEffect(() => {
    if (searchFilters.searchTab === "hotels") {
      if (searchFilters.query || searchFilters.location) {
        setQuery(searchFilters.query ?? searchFilters.location ?? "");
      }
    }
  }, [searchFilters]);

  useEffect(() => {
    if (!tripjackHotelsEnabled) {
      setFeaturedHotels([]);
      setFeaturedCatalogInfo(null);
      setFeaturedLoading(false);
      return;
    }

    let cancelled = false;
    setFeaturedLoading(true);

    void fetch("/api/hotels/featured-catalog?limit=24", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          if (Array.isArray(json.data?.hotels)) {
            setFeaturedHotels(json.data.hotels);
          }
          if (json.data?.catalog || json.data?.filterCounts) {
            setFeaturedCatalogInfo({
              ...json.data.catalog,
              filterCounts: json.data.filterCounts ?? null,
            });
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripjackHotelsEnabled]);

  const maxPrice = useMemo(
    () => Math.max(...initialHotels.map((h) => h.priceFrom), 20000),
    [initialHotels]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setPriceRange([0, maxPrice]);
    setMinStars([]);
    setSelectedBudget([]);
    setSelectedStayTypes([]);
    setSortBy("price_asc");
    resetSearchFilters();
  }, [maxPrice, resetSearchFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (minStars.length > 0) count++;
    if (selectedBudget.length > 0) count++;
    if (selectedStayTypes.length > 0) count++;
    return count;
  }, [query, priceRange, maxPrice, minStars, selectedBudget, selectedStayTypes]);

  const filterProps = {
    priceRange,
    maxPrice,
    onPriceChange: setPriceRange,
    budgetOptions: budgetTierOptions(locale),
    selectedBudget,
    onBudgetToggle: (id: string) =>
      setSelectedBudget((prev) => toggleFilterId(prev, id) as BudgetTierId[]),
    budgetLabel: locale === "hi" ? "बजट श्रेणी" : "Budget Category",
    categories: STAY_CATEGORIES,
    selectedCategories: selectedStayTypes,
    onCategoryToggle: (id: string) =>
      setSelectedStayTypes((prev) => toggleFilterId(prev, id)),
    categoryLabel: locale === "hi" ? "होटल श्रेणी" : "Hotel Category",
    onClear: clearFilters,
    hasActiveFilters: activeFilterCount > 0,
    extraFilters: (
      <div className="space-y-3">
        <p className="text-sm font-medium">{locale === "hi" ? "स्टार रेटिंग" : "Star Rating"}</p>
        <div className="space-y-2">
          {STAR_OPTIONS.map((star) => (
            <label key={star.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={minStars.includes(star.id)}
                onCheckedChange={() =>
                  setMinStars((prev) =>
                    prev.includes(star.id) ? prev.filter((s) => s !== star.id) : [star.id]
                  )
                }
              />
              {star.label}
            </label>
          ))}
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{locale === "hi" ? "लोकप्रिय शहर" : "Popular Cities"}</p>
          {["Delhi", "Goa", "Udaipur", "Jaipur", "Manali"].map((city) => (
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
      </div>
    ),
  };

  const filtered = useMemo(() => {
    const starMin = minStars.length > 0 ? Math.min(...minStars.map(Number)) : 0;
    return initialHotels.filter((h) => {
      const matchQuery =
        !query ||
        h.name.en.toLowerCase().includes(query.toLowerCase()) ||
        h.city.toLowerCase().includes(query.toLowerCase());
      const matchPrice = h.priceFrom >= priceRange[0] && h.priceFrom <= priceRange[1];
      const matchStars = starMin === 0 || h.starRating >= starMin;
      const matchBudget = priceMatchesBudgetTiers(h.priceFrom, selectedBudget, maxPrice);
      const matchStay = matchesStayCategory(h, selectedStayTypes);
      return matchQuery && matchPrice && matchStars && matchBudget && matchStay;
    });
  }, [initialHotels, query, priceRange, minStars, selectedBudget, selectedStayTypes, maxPrice]);

  const sorted = useMemo(
    () => sortHotels(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <section className="container mx-auto px-4 py-6 md:py-10">
      {tripjackHotelsEnabled && (
        <div id="tripjack-featured-hotels">
          <FeaturedTripJackHotelsSection
            hotels={featuredHotels}
            loading={featuredLoading}
            catalogInfo={featuredCatalogInfo}
          />
        </div>
      )}

      {manualHotelsEnabled ? (
        <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0c2444] md:text-3xl">
            {locale === "hi" ? "होटल" : "Curated Hotels"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locale === "hi"
              ? "बजट से लक्ज़री — चुनिंदा होटल और रिसॉर्ट"
              : "Handpicked stays from budget-friendly to luxury resorts"}
          </p>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search city or hotel..."
          className="w-full md:max-w-sm"
        />
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
        </>
      ) : null}
    </section>
  );
}
