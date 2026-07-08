"use client";

import { useMemo, useState } from "react";
import {
  HOTEL_CARD_PLACEHOLDER,
  resolveHotelImageCandidatesWithPlaceholder,
} from "@/lib/tripjack-hotels/hotel-images";
import type { NormalizedHotel, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

interface TripJackHotelCardMediaProps {
  alt: string;
  className?: string;
  imageUrl?: string;
  images?: unknown;
  imageUrls?: string[];
  heroImage?: string;
  staticContent?: { images?: unknown };
  options?: NormalizedHotelOption[];
}

export function TripJackHotelCardMedia({
  alt,
  className = "h-full w-full object-cover",
  imageUrl,
  images,
  imageUrls,
  heroImage,
  staticContent,
  options,
}: TripJackHotelCardMediaProps) {
  const candidates = useMemo(
    () =>
      resolveHotelImageCandidatesWithPlaceholder({
        imageUrl,
        images,
        imageUrls,
        heroImage,
        staticContent,
        options,
      }),
    [heroImage, imageUrl, imageUrls, images, staticContent, options]
  );

  const [candidateIndex, setCandidateIndex] = useState(0);
  const imageSrc = candidates[Math.min(candidateIndex, candidates.length - 1)] ?? HOTEL_CARD_PLACEHOLDER;
  const isPlaceholder = imageSrc === HOTEL_CARD_PLACEHOLDER;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setCandidateIndex((index) => Math.min(index + 1, candidates.length - 1));
        }}
      />
      {isPlaceholder ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/10 to-transparent" />
      ) : null}
    </>
  );
}

export function tripJackHotelCardMediaProps(hotel: NormalizedHotel): TripJackHotelCardMediaProps {
  return {
    alt: hotel.imageCaption || hotel.name,
    imageUrl: hotel.imageUrl,
    images: hotel.images,
    imageUrls: hotel.imageUrls,
    heroImage: hotel.heroImage,
    staticContent: hotel.staticContent,
    options: hotel.options,
  };
}
