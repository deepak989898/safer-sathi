"use client";

import type { BusPassengerDetail, SeatSellerSeat, SeatSellerTrip } from "@/lib/seatseller/types";
import type { BusCityRecord } from "@/lib/seatseller/types";

export interface BusSearchParams {
  sourceCityId: string;
  sourceCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  doj: string;
}

export interface BusSelectedTrip extends SeatSellerTrip {
  startingFare?: number;
}

export interface BusBookingSession {
  search: BusSearchParams;
  trip: BusSelectedTrip;
  selectedSeats: SeatSellerSeat[];
  boardingPoint?: { id: string; location: string; time: string };
  droppingPoint?: { id: string; location: string; time: string };
  passengers?: BusPassengerDetail[];
  bookingId?: string;
  blockExpiresAt?: string;
}

const SESSION_KEY = "safarsathi_bus_booking";

export function saveBusSession(session: BusBookingSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadBusSession(): BusBookingSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BusBookingSession;
  } catch {
    return null;
  }
}

export function clearBusSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function filterCities(cities: BusCityRecord[], query: string): BusCityRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return cities.slice(0, 20);

  const normalize = (name: string) =>
    name
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const ranked = cities
    .map((city) => {
      const raw = city.name.toLowerCase();
      const normalized = normalize(city.name);
      let rank = 99;
      if (raw === q || normalized === q) rank = 0;
      else if (raw.startsWith(q) || normalized.startsWith(q)) rank = 1;
      else if (raw.includes(q) || normalized.includes(q)) rank = 2;
      return { city, rank, normalized };
    })
    .filter((row) => row.rank <= 2)
    .sort((a, b) => a.rank - b.rank || a.city.name.localeCompare(b.city.name));

  const unique = new Map<string, BusCityRecord>();
  for (const row of ranked) {
    if (!unique.has(row.normalized)) unique.set(row.normalized, row.city);
  }
  return [...unique.values()].slice(0, 20);
}
