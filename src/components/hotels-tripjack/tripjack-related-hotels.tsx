"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TripJackHotelGridCard } from "@/components/hotels-tripjack/tripjack-hotel-grid-card";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface RelatedHotelApiItem {
  tjHotelId: number;
  name: string;
  cityName: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  cheapestTotalPrice?: number;
  currency?: string;
}

function toNormalizedHotel(item: RelatedHotelApiItem, currency: string): NormalizedHotel {
  return {
    tjHotelId: item.tjHotelId,
    name: item.name,
    starRating: item.starRating,
    heroImage: item.heroImage,
    imageUrls: item.imageUrls,
    location: item.location || item.cityName,
    cheapestTotalPrice: item.cheapestTotalPrice ?? 0,
    cheapestBasePrice: item.cheapestTotalPrice ?? 0,
    cheapestTaxes: 0,
    cheapestMf: 0,
    cheapestMft: 0,
    currency: item.currency || currency,
    mealBasis: "",
    inclusions: [],
    isRefundable: false,
    panRequired: false,
    passportRequired: false,
    options: [],
    cheapestOption: null,
  };
}

export function TripJackRelatedHotels({
  hid,
  cityName,
  starRating,
  checkIn,
  checkOut,
  locale,
  onViewHotel,
}: {
  hid: string;
  cityName?: string;
  starRating?: number | null;
  checkIn: string;
  checkOut: string;
  locale: Locale;
  onViewHotel: (hotel: NormalizedHotel) => void;
}) {
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      excludeHid: hid,
      checkIn,
      checkOut,
      limit: "6",
    });
    if (cityName) params.set("city", cityName);
    if (starRating != null && starRating > 0) params.set("stars", String(starRating));
    return params.toString();
  }, [hid, cityName, starRating, checkIn, checkOut]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/hotels/related?${query}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: { hotels?: RelatedHotelApiItem[] } }) => {
        if (cancelled || !json.success) return;
        const list = json.data?.hotels ?? [];
        setHotels(
          list
            .filter((h) => (h.imageUrls?.length ?? 0) > 0)
            .map((h) => toNormalizedHotel(h, h.currency || "INR"))
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading || hotels.length === 0) return null;

  return (
    <section className="mt-10 border-t pt-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0c2444]">You may also like</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Similar stays{cityName ? ` in ${cityName}` : ""} with live rates
          </p>
        </div>
        <Link href="/hotels/search" className="text-sm font-semibold text-[#006CE4] hover:underline">
          Search more
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {hotels.slice(0, 6).map((hotel) => (
          <TripJackHotelGridCard
            key={String(hotel.tjHotelId)}
            hotel={hotel}
            locale={locale}
            onViewDetails={onViewHotel}
          />
        ))}
      </div>
    </section>
  );
}
