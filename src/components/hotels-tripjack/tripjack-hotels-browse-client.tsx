"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { CatalogPagination } from "@/components/customer/catalog-pagination";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { ListingLayout } from "@/components/customer/listing-filter-sort";
import { TripJackHotelGridCard } from "@/components/hotels-tripjack/tripjack-hotel-grid-card";
import { TripJackResultsGridSkeleton } from "@/components/hotels-tripjack/tripjack-hotel-grid-skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { HOTEL_SORT_KEYS, type CatalogSortKey } from "@/lib/catalog/sort";
import { bootstrapFeaturedTripJackHotel } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

const STAR_OPTIONS = [
  { id: "3", label: "3+ Stars" },
  { id: "4", label: "4+ Stars" },
  { id: "5", label: "5 Stars" },
];

const POPULAR_CITIES = ["Goa", "Mumbai", "Delhi", "Jaipur", "Bangalore", "Shimla", "Manali", "Udaipur"];

function sortBrowseHotels(hotels: NormalizedHotel[], sortKey: CatalogSortKey): NormalizedHotel[] {
  const list = [...hotels];
  switch (sortKey) {
    case "rating_desc":
      return list.sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0));
    case "name_asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "price_desc":
    case "price_asc":
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function TripJackHotelsBrowseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAppStore();

  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [minStars, setMinStars] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<CatalogSortKey>("name_asc");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1") || 1);

  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [openingId, setOpeningId] = useState<string | number | null>(null);

  const minStarValue = minStars.length > 0 ? Math.min(...minStars.map(Number)) : 0;

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      });
      if (query.trim()) params.set("query", query.trim());
      if (city.trim()) params.set("city", city.trim());
      if (minStarValue > 0) params.set("minStars", String(minStarValue));

      const res = await fetch(`/api/hotels/catalog-browse?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Could not load hotels");
        setHotels([]);
        setTotalCount(0);
        setTotalPages(1);
        return;
      }

      setHotels(json.data.hotels ?? []);
      setTotalCount(json.data.totalCount ?? 0);
      setTotalPages(json.data.totalPages ?? 1);
    } catch {
      toast.error("Could not load hotels");
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [page, query, city, minStarValue]);

  useEffect(() => {
    void fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (query.trim()) params.set("query", query.trim());
    if (city.trim()) params.set("city", city.trim());
    const qs = params.toString();
    router.replace(qs ? `/hotels/browse?${qs}` : "/hotels/browse", { scroll: false });
  }, [page, query, city, router]);

  const sortedHotels = useMemo(() => sortBrowseHotels(hotels, sortBy), [hotels, sortBy]);

  const startIndex = totalCount === 0 ? 0 : (page - 1) * 50 + 1;
  const endIndex = Math.min(page * 50, totalCount);

  const clearFilters = () => {
    setQuery("");
    setCity("");
    setMinStars([]);
    setSortBy("name_asc");
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (city.trim()) count++;
    if (minStars.length > 0) count++;
    return count;
  }, [query, city, minStars]);

  const onViewDetails = async (hotel: NormalizedHotel) => {
    if (openingId != null) return;
    setOpeningId(hotel.tjHotelId);
    try {
      const result = await bootstrapFeaturedTripJackHotel({
        tjHotelId: Number(hotel.tjHotelId),
        hotelName: hotel.name,
        location: hotel.location,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
    } finally {
      setOpeningId(null);
    }
  };

  const filterProps = {
    priceRange: [0, 0] as [number, number],
    maxPrice: 0,
    onPriceChange: () => undefined,
    budgetOptions: [],
    selectedBudget: [],
    onBudgetToggle: () => undefined,
    budgetLabel: "",
    categories: [],
    selectedCategories: [],
    onCategoryToggle: () => undefined,
    categoryLabel: "",
    onClear: clearFilters,
    hasActiveFilters: activeFilterCount > 0,
    hidePriceFilter: true,
    extraFilters: (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">City</p>
          <SearchInput
            value={city}
            onChange={(value) => {
              setCity(value);
              setPage(1);
            }}
            placeholder="Filter by city..."
          />
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Popular cities</p>
          {POPULAR_CITIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setCity(name);
                setPage(1);
              }}
              className="block text-sm text-primary hover:underline"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Star rating</p>
          <div className="space-y-2">
            {STAR_OPTIONS.map((star) => (
              <label key={star.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={minStars.includes(star.id)}
                  onCheckedChange={() => {
                    setMinStars((prev) =>
                      prev.includes(star.id) ? prev.filter((s) => s !== star.id) : [star.id]
                    );
                    setPage(1);
                  }}
                />
                {star.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <section className="container mx-auto px-4 py-6 md:py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#006CE4]" />
            <h1 className="text-2xl font-bold text-[#0c2444] md:text-3xl">All TripJack hotels</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Browse India hotels with photos — 50 per page. Click any hotel to view rooms and book.
          </p>
        </div>
        <Link href="/hotels" className="text-sm font-semibold text-[#1a4fa3] hover:underline">
          ← Back to hotels home
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search city or hotel name..."
          className="w-full md:max-w-xl"
        />
      </div>

      <ListingLayout
        filterSidebar={<FilterSidebar {...filterProps} />}
        mobileFilterPanel={<FilterSidebar {...filterProps} embedded />}
        sortKeys={HOTEL_SORT_KEYS.filter((key) => key !== "price_asc" && key !== "price_desc")}
        sortValue={sortBy}
        onSortChange={setSortBy}
        activeFilterCount={activeFilterCount}
        resultCount={totalCount}
      >
        {loading ? (
          <TripJackResultsGridSkeleton count={6} />
        ) : sortedHotels.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No hotels found. Try another city or hotel name.
          </p>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sortedHotels.map((hotel) => (
                <div key={String(hotel.tjHotelId)} className="relative">
                  {openingId === hotel.tjHotelId && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
                      <Loader2 className="h-8 w-8 animate-spin text-[#006CE4]" />
                    </div>
                  )}
                  <TripJackHotelGridCard
                    hotel={hotel}
                    locale={locale}
                    onViewDetails={() => void onViewDetails(hotel)}
                  />
                </div>
              ))}
            </div>

            <CatalogPagination
              page={page}
              totalPages={totalPages}
              total={totalCount}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </ListingLayout>
    </section>
  );
}
