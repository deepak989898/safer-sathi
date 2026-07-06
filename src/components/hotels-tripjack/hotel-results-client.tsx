"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, SlidersHorizontal } from "lucide-react";
import { HotelCard } from "@/components/hotels-tripjack/hotel-card";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelCard as HotelUiCard, HotelFieldLabel, HotelPrimaryButton } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { useAuth } from "@/contexts/auth-context";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { loadHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

type SortKey = "price_asc" | "price_desc" | "name";

const PAGE_SIZE = 10;

export function HotelResultsClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;

  const [ready, setReady] = useState(false);
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [contextLabel, setContextLabel] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [breakfastOnly, setBreakfastOnly] = useState(false);
  const [minStars, setMinStars] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const session = loadHotelListingSession();
    if (!session.hotels.length || !session.correlationId) {
      router.replace("/hotels/search");
      return;
    }
    setHotels(session.hotels);
    setTotalResults(session.totalResults);
    const ctx = session.searchContext;
    if (ctx) {
      const parts = [
        ctx.destinationLabel || ctx.destination,
        `${ctx.checkIn} → ${ctx.checkOut}`,
      ].filter(Boolean);
      setContextLabel(parts.join(" · "));
    }
    setReady(true);
  }, [router]);

  const filtered = useMemo(() => {
    let list = [...hotels];
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }
    if (refundableOnly) list = list.filter((h) => h.isRefundable);
    if (breakfastOnly) list = list.filter((h) => h.hasBreakfast);
    if (minStars > 0) {
      list = list.filter((h) => (h.starRating ?? 0) >= minStars);
    }
    if (maxPrice !== "" && maxPrice > 0) {
      list = list.filter((h) => h.cheapestTotalPrice <= maxPrice);
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price_desc") return b.cheapestTotalPrice - a.cheapestTotalPrice;
      return a.cheapestTotalPrice - b.cheapestTotalPrice;
    });
    return list;
  }, [hotels, nameFilter, sort, refundableOnly, breakfastOnly, minStars, maxPrice]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const onViewDetails = (hotel: NormalizedHotel) => {
    router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        Loading results…
      </div>
    );
  }

  const destinationTitle = contextLabel.split(" · ")[0] || "Hotels";

  return (
    <HotelBookingLayout
      title={`${destinationTitle} — ${totalResults} Hotels found`}
      subtitle={contextLabel}
      backHref="/hotels/search"
      backLabel="Modify search"
      maxWidth="xl"
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <HotelUiCard padding="sm">
            <div className="mb-3 flex items-center gap-2 font-bold" style={{ color: HOTEL_UI.primary }}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>
            <HotelFieldLabel>Search by name</HotelFieldLabel>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded border bg-white pl-9 pr-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                placeholder="Hotel name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <HotelFieldLabel>Sort by</HotelFieldLabel>
              <select
                className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={refundableOnly}
                onChange={(e) => {
                  setRefundableOnly(e.target.checked);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              Refundable only
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={breakfastOnly}
                onChange={(e) => {
                  setBreakfastOnly(e.target.checked);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              Free breakfast
            </label>
            <div className="mt-4">
              <HotelFieldLabel>Minimum star rating</HotelFieldLabel>
              <select
                className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={minStars}
                onChange={(e) => {
                  setMinStars(Number(e.target.value));
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <option value={0}>Any</option>
                <option value={3}>3+ stars</option>
                <option value={4}>4+ stars</option>
                <option value={5}>5 stars</option>
              </select>
            </div>
            <div className="mt-4">
              <HotelFieldLabel>Max price (INR)</HotelFieldLabel>
              <input
                type="number"
                min={0}
                className="mt-1.5 h-10 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                placeholder="No limit"
                value={maxPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setMaxPrice(value === "" ? "" : Number(value));
                  setVisibleCount(PAGE_SIZE);
                }}
              />
            </div>
          </HotelUiCard>
        </aside>

        <div className="space-y-4">
          {filtered.length === 0 && (
            <HotelUiCard className="py-16 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
                No hotels found
              </p>
              <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                Try different dates or filters.
              </p>
              <div className="mx-auto mt-6 max-w-xs">
                <HotelPrimaryButton onClick={() => router.push("/hotels/search")}>
                  Search again
                </HotelPrimaryButton>
              </div>
            </HotelUiCard>
          )}

          {visible.map((hotel) => (
            <HotelCard
              key={String(hotel.tjHotelId)}
              hotel={hotel}
              locale={locale}
              onViewDetails={onViewDetails}
            />
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <HotelPrimaryButton
                variant="outline"
                className="!w-auto px-8"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </HotelPrimaryButton>
            </div>
          )}

          {isStaff && hotels.length > 0 && (
            <p className="text-xs text-slate-400">Staff: {hotels.length} raw results loaded</p>
          )}
        </div>
      </div>
    </HotelBookingLayout>
  );
}
