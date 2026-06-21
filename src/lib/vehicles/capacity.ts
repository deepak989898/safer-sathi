import type { Vehicle } from "@/types";

/** @deprecated Use VEHICLE_MIN_KM_ROUND_TRIP from pricing-policy */
export const VEHICLE_MIN_KM = 100;

/** Approximate medium bags the vehicle can carry comfortably. */
export function estimateLuggageCapacity(seats: number): number {
  if (seats <= 5) return 3;
  if (seats <= 7) return 5;
  if (seats <= 12) return 8;
  if (seats <= 20) return 12;
  return Math.min(20, Math.round(seats * 0.45));
}

export function getEffectivePricePerKm(vehicle: Vehicle): number {
  return vehicle.pricePerKm ?? Math.round(vehicle.pricePerDay / 200);
}

export function vehicleFitsGuests(vehicle: Vehicle, guests?: number): boolean {
  if (!guests || guests <= 0) return true;
  return vehicle.seats >= guests;
}
