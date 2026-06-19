import { getHotels, getPackages, getVehicles } from "@/lib/data-service";
import {
  getActivitiesByDestination,
  hydrateActivitiesStore,
} from "@/lib/activity-store";
import { localizedText } from "@/lib/i18n";
import type { CustomPackageQuote, CustomPackageLineItem } from "@/types/travel-manager";
import type { Hotel, HotelRoom, Locale, Vehicle } from "@/types";

export interface BuildQuoteInput {
  destination: string;
  tripType?: string;
  activityNames: string[];
  guests: number;
  budget?: number;
  durationDays: number;
  pickupCity?: string;
  locale: Locale;
}

function pickHotel(hotels: Hotel[], guests: number, tripType?: string): Hotel | null {
  const available = hotels.filter((h) => h.available);
  if (available.length === 0) return null;

  const sorted = [...available].sort((a, b) => {
    if (tripType === "luxury") return b.starRating - a.starRating || b.priceFrom - a.priceFrom;
    if (tripType === "budget") return a.priceFrom - b.priceFrom;
    return b.rating - a.rating || a.priceFrom - b.priceFrom;
  });

  return sorted.find((h) =>
    h.rooms.some((r) => r.available && r.maxGuests >= Math.min(guests, 2))
  ) ?? sorted[0];
}

function pickRoom(hotel: Hotel, guests: number, tripType?: string): HotelRoom | null {
  const rooms = hotel.rooms.filter((r) => r.available);
  if (rooms.length === 0) return null;

  if (tripType === "luxury") {
    return (
      rooms.find((r) => r.type === "suite") ??
      rooms.find((r) => r.type === "deluxe") ??
      rooms[0]
    );
  }
  if (tripType === "budget") {
    return (
      rooms.find((r) => r.type === "standard") ??
      rooms.sort((a, b) => a.pricePerNight - b.pricePerNight)[0]
    );
  }
  return (
    rooms.find((r) => r.maxGuests >= guests) ??
    rooms.find((r) => r.type === "deluxe") ??
    rooms[0]
  );
}

function pickVehicle(vehicles: Vehicle[], guests: number, tripType?: string): Vehicle | null {
  const available = vehicles.filter((v) => v.available && v.seats >= guests);
  if (available.length === 0) {
    return (
      vehicles
        .filter((v) => v.available)
        .sort((a, b) => b.seats - a.seats)[0] ?? null
    );
  }

  const sorted = [...available].sort((a, b) => {
    if (tripType === "luxury") return b.pricePerDay - a.pricePerDay;
    if (tripType === "budget") return a.pricePerDay - b.pricePerDay;
    return a.pricePerDay - b.pricePerDay;
  });
  return sorted[0];
}

function filterHotelsByBudgetTier(hotels: Hotel[], tier: string): Hotel[] {
  const available = hotels.filter((h) => h.available);
  switch (tier) {
    case "2000":
      return available.filter((h) => h.priceFrom <= 3000);
    case "5000":
      return available.filter((h) => h.priceFrom <= 7000);
    case "10000":
      return available.filter((h) => h.priceFrom <= 15000);
    case "luxury":
      return available.filter((h) => h.starRating >= 4);
    default:
      return available;
  }
}

export async function buildCustomPackageQuote(
  input: BuildQuoteInput
): Promise<CustomPackageQuote> {
  await hydrateActivitiesStore();
  const [allHotels, allVehicles] = await Promise.all([getHotels(), getVehicles()]);

  const dest = input.destination.toLowerCase();
  const hotels = allHotels.filter(
    (h) =>
      h.city.toLowerCase().includes(dest) ||
      h.location.toLowerCase().includes(dest) ||
      h.state?.toLowerCase().includes(dest) ||
      dest.includes(h.city.toLowerCase())
  );

  const hotel = pickHotel(hotels.length > 0 ? hotels : allHotels, input.guests, input.tripType);
  const room = hotel ? pickRoom(hotel, input.guests, input.tripType) : null;
  const nights = Math.max(1, input.durationDays - 1);
  const roomsNeeded = Math.max(1, Math.ceil(input.guests / (room?.maxGuests ?? 2)));
  const hotelTotal = room ? room.pricePerNight * nights * roomsNeeded : 0;

  const vehicle = pickVehicle(allVehicles, input.guests, input.tripType);
  const vehicleTotal = vehicle ? vehicle.pricePerDay * input.durationDays : 0;

  await hydrateActivitiesStore();
  const destActivities = getActivitiesByDestination(input.destination);
  const selectedActs = input.activityNames.length
    ? destActivities.filter((a) =>
        input.activityNames.some(
          (n) =>
            a.name.en.toLowerCase().includes(n.toLowerCase()) ||
            n.toLowerCase().includes(a.name.en.toLowerCase())
        )
      )
    : destActivities.slice(0, 3);

  const activityItems = selectedActs.map((a) => ({
    id: a.id,
    name: localizedText(a.name, input.locale),
    price: a.price * input.guests,
  }));

  const activitiesTotal = activityItems.reduce((s, a) => s + a.price, 0);
  const lineItems: CustomPackageLineItem[] = [];

  if (hotel && room) {
    lineItems.push({
      label: "Hotel",
      detail: `${localizedText(hotel.name, input.locale)} — ${localizedText(room.name, input.locale)} × ${nights} nights`,
      amount: hotelTotal,
    });
  }
  if (vehicle) {
    lineItems.push({
      label: "Vehicle",
      detail: `${localizedText(vehicle.name, input.locale)} × ${input.durationDays} days`,
      amount: vehicleTotal,
    });
  }
  for (const act of activityItems) {
    lineItems.push({ label: "Activity", detail: act.name, amount: act.price });
  }

  let totalAmount = hotelTotal + vehicleTotal + activitiesTotal;
  if (totalAmount === 0) {
    const pkgs = await getPackages();
    const match = pkgs.find((p) =>
      p.cities.some((c) => c.toLowerCase().includes(dest))
    );
    if (match) totalAmount = match.price;
  }

  const title = `${input.destination} ${input.tripType ? input.tripType.charAt(0).toUpperCase() + input.tripType.slice(1) : ""} Package`.trim();

  return {
    title,
    destination: input.destination,
    durationDays: input.durationDays,
    guests: input.guests,
    hotel: hotel && room
      ? {
          id: hotel.id,
          name: localizedText(hotel.name, input.locale),
          starRating: hotel.starRating,
          roomType: localizedText(room.name, input.locale),
          pricePerNight: room.pricePerNight,
          total: hotelTotal,
          image: hotel.images[0],
        }
      : undefined,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          name: localizedText(vehicle.name, input.locale),
          pricePerDay: vehicle.pricePerDay,
          pricePerKm: vehicle.pricePerKm,
          total: vehicleTotal,
          image: vehicle.images[0],
        }
      : undefined,
    activities: activityItems,
    meals: ["Breakfast", "Dinner"],
    pickup: input.pickupCity ?? "Delhi",
    lineItems,
    totalAmount,
    serviceId: `ai_pkg_${Date.now()}`,
    notes: JSON.stringify({
      destination: input.destination,
      tripType: input.tripType,
      activities: input.activityNames,
      hotelId: hotel?.id,
      vehicleId: vehicle?.id,
      livePricing: true,
    }),
  };
}

export async function searchHotelsForDestination(
  destination: string,
  budgetTier?: string,
  limit = 6
) {
  const all = await getHotels();
  const dest = destination.toLowerCase();
  let matched = all.filter(
    (h) =>
      h.available &&
      (h.city.toLowerCase().includes(dest) ||
        h.location.toLowerCase().includes(dest) ||
        dest.includes(h.city.toLowerCase()))
  );
  if (matched.length === 0) matched = all.filter((h) => h.available);
  if (budgetTier) matched = filterHotelsByBudgetTier(matched, budgetTier);
  return matched.slice(0, limit);
}

export async function searchVehiclesForGuests(guests: number, limit = 5) {
  const all = await getVehicles();
  return all
    .filter((v) => v.available)
    .sort((a, b) => {
      const aFit = a.seats >= guests ? 0 : 1;
      const bFit = b.seats >= guests ? 0 : 1;
      if (aFit !== bFit) return aFit - bFit;
      return a.pricePerDay - b.pricePerDay;
    })
    .slice(0, limit);
}
