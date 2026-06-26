import { getPackageById, getVehicleById } from "@/lib/catalog-service";
import { isCatalogPublished } from "@/lib/catalog/publish";
import { getEffectiveHotelPriceFrom } from "@/lib/catalog/hotel-pricing";
import { getHotelByIdAdmin, reloadHotelsStore } from "@/lib/hotel-store";
import { getEffectivePricePerKm } from "@/lib/vehicles/capacity";
import { calculateBillableKmFromOneWay } from "@/lib/vehicles/pricing-policy";
import type { ServiceType } from "@/types";

const PRICE_TOLERANCE = 1;

export interface BookingPriceInput {
  serviceType: ServiceType;
  serviceId: string;
  amount: number;
  guests: number;
  startDate: string;
  endDate?: string;
  bookingMode?: "day" | "km";
  distanceKm?: number;
  notes?: string;
}

function nightsBetween(startDate: string, endDate?: string): number {
  if (!endDate) return 1;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

function amountsMatch(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) <= PRICE_TOLERANCE;
}

function extractHotelRoomPrice(notes?: string): number | null {
  if (!notes) return null;
  const match = notes.match(/₹([\d,]+)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function validateBookingAmount(
  input: BookingPriceInput
): Promise<{ ok: true; amount: number } | { ok: false; message: string }> {
  const { serviceType, serviceId, guests, startDate, endDate, bookingMode, distanceKm } =
    input;

  switch (serviceType) {
    case "package":
    case "holiday": {
      const pkg = await getPackageById(serviceId);
      if (!pkg) return { ok: false, message: "Package not found" };
      const expected = pkg.price * Math.max(1, guests);
      if (!amountsMatch(expected, input.amount)) {
        return { ok: false, message: "Booking amount does not match package price" };
      }
      return { ok: true, amount: expected };
    }

    case "vehicle":
    case "car_rental":
    case "tempo_traveller":
    case "airport_pickup": {
      const vehicle = await getVehicleById(serviceId);
      if (!vehicle) return { ok: false, message: "Vehicle not found" };

      const pricePerKm = getEffectivePricePerKm(vehicle);
      let expected: number;

      if (bookingMode === "km") {
        const billableKm =
          distanceKm && distanceKm > 0
            ? distanceKm
            : calculateBillableKmFromOneWay(100);
        expected = pricePerKm * billableKm;
      } else {
        const days = nightsBetween(startDate, endDate);
        expected = vehicle.pricePerDay * days;
      }

      if (!amountsMatch(expected, input.amount)) {
        return { ok: false, message: "Booking amount does not match vehicle price" };
      }
      return { ok: true, amount: expected };
    }

    case "hotel": {
      await reloadHotelsStore();
      const hotel = getHotelByIdAdmin(serviceId);
      if (!hotel?.available || !isCatalogPublished(hotel.publishStatus)) {
        return { ok: false, message: "Hotel not found" };
      }

      const nights = nightsBetween(startDate, endDate);
      const roomPrice = extractHotelRoomPrice(input.notes);
      const nightlyRate = roomPrice ?? getEffectiveHotelPriceFrom(hotel);
      const expected = nightlyRate * nights;

      if (!amountsMatch(expected, input.amount)) {
        return { ok: false, message: "Booking amount does not match hotel price" };
      }
      return { ok: true, amount: expected };
    }

    case "bus": {
      if (input.amount <= 0) {
        return { ok: false, message: "Invalid booking amount" };
      }
      return { ok: true, amount: input.amount };
    }

    default:
      return { ok: false, message: "Unsupported service type" };
  }
}
