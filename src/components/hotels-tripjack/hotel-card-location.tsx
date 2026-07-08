"use client";

import { MapPin } from "lucide-react";

interface HotelCardLocationProps {
  location?: string | null;
  className?: string;
}

/** TripJack hotel card location — gray, one line, ellipsis when long. */
export function HotelCardLocation({ location, className }: HotelCardLocationProps) {
  if (!location?.trim()) return null;

  return (
    <p className={`flex min-w-0 items-center gap-1 text-sm text-muted-foreground ${className ?? ""}`}>
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{location}</span>
    </p>
  );
}
