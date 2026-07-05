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

  useEffect(() => {
    const session = loadHotelListingSession();
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
  }, []);

  const filtered = useMemo(() => {
    let list = [...hotels];
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }
    if (refundableOnly) list = list.filter((h) => h.isRefundable);
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price_desc") return b.cheapestTotalPrice - a.cheapestTotalPrice;
      return a.cheapestTotalPrice - b.cheapestTotalPrice;
    });
    return list;
  }, [hotels, nameFilter, sort, refundableOnly]);

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
                onChange={(e) => setRefundableOnly(e.target.checked)}
              />
              Refundable only
            </label>
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

          {filtered.map((hotel) => (
            <HotelCard
              key={String(hotel.tjHotelId)}
              hotel={hotel}
              locale={locale}
              onViewDetails={onViewDetails}
            />
          ))}

          {isStaff && hotels.length > 0 && (
            <p className="text-xs text-slate-400">Staff: {hotels.length} raw results loaded</p>
          )}
        </div>
      </div>
    </HotelBookingLayout>
  );
}
