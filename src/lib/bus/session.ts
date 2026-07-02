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
  return cities
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 20);
}
