"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/customer/page-hero";
import { FilterSidebar, SearchInput } from "@/components/customer/filter-sidebar";
import { HotelCard } from "@/components/customer/hotel-card";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
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
  const { locale } = useAppStore();
  const [query, setQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [minStars, setMinStars] = useState<string[]>([]);

  const maxPrice = useMemo(
    () => Math.max(...initialHotels.map((h) => h.priceFrom), 20000),
    [initialHotels]
  );

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

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

  return (
    <>
      <PageHero
        title="Hotels"
        subtitle="Handpicked stays from budget-friendly to luxury resorts"
        image="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80"
      />
      <section className="container mx-auto px-4 py-10">
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Search city or hotel..." />
        </div>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <FilterSidebar
            priceRange={priceRange}
            maxPrice={maxPrice}
            onPriceChange={setPriceRange}
            categories={STAR_OPTIONS}
            selectedCategories={minStars}
            onCategoryToggle={(id) =>
              setMinStars((prev) =>
                prev.includes(id) ? prev.filter((s) => s !== id) : [id]
              )
            }
            onClear={() => {
              setQuery("");
              setPriceRange([0, maxPrice]);
              setMinStars([]);
            }}
            extraFilters={
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
            }
          />
          <div>
            {filtered.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">
                {t(locale, "common", "noResults")}
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
