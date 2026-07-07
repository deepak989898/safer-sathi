"use client";

import { useEffect, useState } from "react";
import { TripJackHotelGridCard } from "@/components/hotels-tripjack/tripjack-hotel-grid-card";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { useRouter } from "next/navigation";

function toNormalizedHotel(card: FeaturedTripJackHotelCard): NormalizedHotel {
  return {
    tjHotelId: card.tjHotelId,
    name: card.name,
    starRating: card.starRating,
    heroImage: card.heroImage,
    imageUrls: card.imageUrls,
    imageCaption: card.imageCaption,
    location: card.location || card.cityName,
    cheapestTotalPrice: 0,
    cheapestBasePrice: 0,
    cheapestTaxes: 0,
    cheapestMf: 0,
    cheapestMft: 0,
    currency: "INR",
    mealBasis: "",
    inclusions: card.amenities ?? [],
    isRefundable: false,
    panRequired: false,
    passportRequired: false,
    options: [],
    cheapestOption: null,
  };
}

export function RelatedLiveHotels({
  hid,
  cityName,
  starRating,
}: {
  hid: string | number;
  cityName?: string;
  starRating?: number | null;
}) {
  const router = useRouter();
  const { locale } = useAppStore();
  const [hotels, setHotels] = useState<FeaturedTripJackHotelCard[]>([]);

  useEffect(() => {
    if (!cityName) return;
    const params = new URLSearchParams({
      hid: String(hid),
      city: cityName,
      limit: "6",
    });
    if (starRating != null) params.set("stars", String(starRating));

    void fetch(`/api/hotels/related-catalog?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.hotels)) {
          setHotels(json.data.hotels);
        }
      })
      .catch(() => undefined);
  }, [hid, cityName, starRating]);

  if (hotels.length === 0) return null;

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="mb-4 text-lg font-bold text-[#0c2444] md:text-xl">Related live hotels</h2>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {hotels.map((hotel) => (
          <TripJackHotelGridCard
            key={hotel.tjHotelId}
            hotel={toNormalizedHotel(hotel)}
            locale={locale}
            onViewDetails={() =>
              router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`)
            }
          />
        ))}
      </div>
    </section>
  );
}
