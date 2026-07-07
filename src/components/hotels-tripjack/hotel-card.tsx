"use client";

import { useState } from "react";
import { Building2, Star } from "lucide-react";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { HotelPrimaryButton, HotelStatusBadge } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { formatCurrency } from "@/lib/i18n";
import { resolveHotelCardImageUrl } from "@/lib/tripjack-hotels/hotel-images";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

interface HotelCardProps {
  hotel: NormalizedHotel;
  locale: Locale;
  onViewDetails: (hotel: NormalizedHotel) => void;
}

export function HotelCard({ hotel, locale, onViewDetails }: HotelCardProps) {
  const stars = hotel.starRating && hotel.starRating > 0 ? Math.min(5, Math.round(hotel.starRating)) : 0;
  const imageSrc = resolveHotelCardImageUrl(hotel);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageSrc) && !imageFailed;

  return (
    <article
      className="flex flex-col overflow-hidden border bg-white shadow-sm transition hover:shadow-md md:flex-row"
      style={{ borderRadius: HOTEL_UI.cardRadius, borderColor: HOTEL_UI.border }}
    >
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-slate-100 md:h-auto md:min-h-[12rem] md:w-56 lg:w-64">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={hotel.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
            style={{ color: HOTEL_UI.textMuted }}
          >
            <Building2 className="h-8 w-8 opacity-40" />
            <span className="text-xs font-medium uppercase tracking-wide">No image</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
              {hotel.name}
            </h3>
            {stars > 0 && (
              <div className="mt-1 flex items-center gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#FEBA02] text-[#FEBA02]" />
                ))}
              </div>
            )}
            {hotel.location && (
              <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                {hotel.location}
              </p>
            )}
            <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
              {hotel.mealBasis || "Hotel"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
              {hotel.hasBreakfast && <span>Breakfast included</span>}
              {hotel.isRefundable ? (
                <HotelStatusBadge status="confirmed" className="!text-[9px]" />
              ) : null}
            </div>
            {hotel.inclusions.length > 0 && (
              <p className="mt-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
                {hotel.inclusions.slice(0, 3).join(" · ")}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right md:min-w-[140px]">
            <p className="text-xs font-medium uppercase" style={{ color: HOTEL_UI.textMuted }}>
              From
            </p>
            <p className="text-2xl font-bold" style={{ color: HOTEL_UI.primary }}>
              {formatCurrency(hotel.cheapestTotalPrice, locale)}
            </p>
            <p className="text-[10px]" style={{ color: HOTEL_UI.textMuted }}>
              incl. taxes · {hotel.options.length} room option{hotel.options.length === 1 ? "" : "s"}
            </p>
            <div className="mt-3 w-full min-w-[120px]">
              <HotelPrimaryButton
                className="!h-10 !w-full text-xs"
                onClick={() => onViewDetails(hotel)}
              >
                View Rooms
              </HotelPrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
