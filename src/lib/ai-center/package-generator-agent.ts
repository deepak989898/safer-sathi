import { calculatePackagePrice } from "@/lib/ai-travel-manager/agents/price-calculator";
import { routeCompletion } from "@/lib/ai/router";
import { getAdminHotels, hydrateHotelsStore } from "@/lib/hotel-store";
import { getAdminVehicles, hydrateVehiclesStore } from "@/lib/vehicle-store";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { appUrl } from "@/lib/site-config";
import { slugify } from "@/lib/ai-center/utils";
import type {
  AiPackageHotelRef,
  AiPackagePriceBreakdown,
  AiPackageSeoMeta,
  AiPackageVehicleRef,
  AiTourPackage,
} from "@/lib/ai-center/types";
import type { Hotel, PackageCategory, Vehicle } from "@/types";

export interface GenerateTourPackageInput {
  destination: string;
  durationDays?: number;
  hotelId?: string;
  vehicleId?: string;
  useGeneratedHotel?: boolean;
  useGeneratedVehicle?: boolean;
  travelers?: number;
  marginPercent?: number;
}

function pickCategory(destination: string): PackageCategory {
  const d = destination.toLowerCase();
  if (["dubai", "thailand", "bali", "maldives", "singapore"].some((x) => d.includes(x))) {
    return "international";
  }
  if (d.includes("honeymoon") || d.includes("goa")) return "honeymoon";
  if (d.includes("char dham") || d.includes("temple")) return "religious";
  if (d.includes("manali") || d.includes("rishikesh")) return "adventure";
  return "domestic";
}

function matchHotels(destination: string, hotels: Hotel[]): Hotel[] {
  const d = destination.toLowerCase();
  return hotels.filter(
    (h) =>
      h.city.toLowerCase().includes(d) ||
      h.location.toLowerCase().includes(d) ||
      d.includes(h.city.toLowerCase())
  );
}

function matchVehicles(_destination: string, vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter((v) => v.available).slice(0, 8);
}

function buildItinerary(destination: string, days: number) {
  const places = [
    `${destination} Mall Road`,
    `${destination} View Point`,
    `${destination} Local Market`,
    "Adventure Park",
    "Heritage Site",
  ];
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}: Explore ${destination}`,
    description: `Guided sightseeing and comfortable transfers across ${destination}.`,
    activities: ["Sightseeing", "Local cuisine", "Hotel stay", "Transfers"],
    places: [places[i % places.length], places[(i + 1) % places.length]],
  }));
}

function toPriceBreakdown(
  calc: ReturnType<typeof calculatePackagePrice>,
  activitiesCost: number,
  marginPercent: number
): AiPackagePriceBreakdown {
  const subtotal =
    calc.hotelCost + calc.vehicleCost + calc.guideCost + calc.foodCost + activitiesCost;
  const margin = Math.round(subtotal * (marginPercent / 100));
  const gst = Math.round((subtotal + margin) * 0.05);
  const finalPrice = subtotal + margin + gst;

  return {
    hotelCost: calc.hotelCost,
    vehicleCost: calc.vehicleCost,
    activitiesCost,
    guideCost: calc.guideCost,
    mealsCost: calc.foodCost,
    margin,
    marginPercent,
    gst,
    gstPercent: 5,
    subtotal,
    finalPrice,
  };
}

function buildHotelRef(
  destination: string,
  hotels: Hotel[],
  hotelId?: string,
  useGenerated?: boolean
): AiPackageHotelRef {
  if (useGenerated || !hotelId) {
    const matched = matchHotels(destination, hotels)[0];
    if (matched && !useGenerated) {
      return {
        mode: "existing",
        hotelId: matched.id,
        name: matched.name.en,
        city: matched.city,
        starRating: matched.starRating,
        pricePerNight: matched.priceFrom,
      };
    }
    return {
      mode: "generated",
      name: `Premium ${destination} Resort`,
      city: destination,
      starRating: 4,
      pricePerNight: 4500,
    };
  }
  const hotel = hotels.find((h) => h.id === hotelId);
  return {
    mode: "existing",
    hotelId: hotel?.id,
    name: hotel?.name.en ?? `Hotel in ${destination}`,
    city: hotel?.city ?? destination,
    starRating: hotel?.starRating ?? 3,
    pricePerNight: hotel?.priceFrom ?? 3500,
  };
}

function buildVehicleRef(
  vehicles: Vehicle[],
  vehicleId?: string,
  useGenerated?: boolean
): AiPackageVehicleRef {
  const defaults = [
    "Swift Dzire",
    "Toyota Innova Crysta",
    "Tempo Traveller",
    "Fortuner",
    "Luxury Bus",
  ];
  if (useGenerated || !vehicleId) {
    const matched = matchVehicles("", vehicles)[0];
    if (matched && !useGenerated) {
      return {
        mode: "existing",
        vehicleId: matched.id,
        name: matched.name.en,
        type: matched.type,
        seats: matched.seats,
        pricePerDay: matched.pricePerDay,
      };
    }
    return {
      mode: "generated",
      name: defaults[2],
      type: "tempo_traveller",
      seats: 12,
      pricePerDay: 5500,
    };
  }
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  return {
    mode: "existing",
    vehicleId: vehicle?.id,
    name: vehicle?.name.en ?? defaults[1],
    type: vehicle?.type,
    seats: vehicle?.seats ?? 6,
    pricePerDay: vehicle?.pricePerDay ?? 4200,
  };
}

function buildSeoMeta(destination: string, title: string, slug: string): AiPackageSeoMeta {
  const focus = `${destination} Tour Package`.trim();
  return {
    metaTitle: `${title} | Safar Sathi`,
    metaDescription: `Book ${title} with hotels, vehicle, meals & activities. Best price guaranteed on Safar Sathi.`,
    focusKeyword: focus,
    slug,
    metaKeywords: [
      focus,
      `${destination} package`,
      `best ${destination} tour`,
      `${destination} holiday`,
    ],
    faq: [
      {
        question: `What is included in the ${destination} package?`,
        answer: "Hotels, vehicle, meals, sightseeing, and transfers as per itinerary.",
      },
      {
        question: `What is the best time to visit ${destination}?`,
        answer: "October to March is ideal for most North India destinations.",
      },
    ],
    canonicalUrl: appUrl(`/packages/${slug}`),
  };
}

export async function generateAiTourPackage(
  input: GenerateTourPackageInput
): Promise<Omit<AiTourPackage, "id" | "createdAt" | "updatedAt" | "status">> {
  const destination = input.destination.trim();
  const days = input.durationDays ?? 5;
  const category = pickCategory(destination);
  const marginPercent = input.marginPercent ?? 18;

  await Promise.all([hydrateHotelsStore(), hydrateVehiclesStore()]);
  const hotels = getAdminHotels();
  const vehicles = getAdminVehicles();

  const calc = calculatePackagePrice({
    category,
    durationDays: days,
    travelers: input.travelers ?? 4,
  });
  const activitiesCost = Math.round(days * 1200);
  const priceBreakdown = toPriceBreakdown(calc, activitiesCost, marginPercent);

  const title = `${destination} ${days}D/${days - 1}N Premium Tour Package`;
  const slug = slugify(`${destination}-tour-package-${days}d`);
  const placesToVisit = [
    `${destination} Main Market`,
    `${destination} Scenic Point`,
    "Adventure Hub",
    "Cultural Heritage Site",
  ];

  const { content: overview } = await routeCompletion(
    "Write a 2-sentence travel package overview for India tours.",
    [{ role: "user", content: `${title}, ₹${priceBreakdown.finalPrice}` }],
    async () =>
      `Experience the best of ${destination} with curated hotels, private vehicle, guided sightseeing, and hassle-free transfers.`,
    { timeoutMs: 4000, maxTokens: 180 }
  );

  const hotel = buildHotelRef(destination, hotels, input.hotelId, input.useGeneratedHotel);
  const vehicle = buildVehicleRef(vehicles, input.vehicleId, input.useGeneratedVehicle);

  const images = [
    TRAVEL_IMAGES.manaliAdventure,
    TRAVEL_IMAGES.hotelLuxury,
    TRAVEL_IMAGES.goldenTriangle,
  ];

  return {
    destination,
    title,
    overview,
    shortDescription: overview.slice(0, 160),
    duration: days,
    durationLabel: `${days - 1} Nights / ${days} Days`,
    itinerary: buildItinerary(destination, days),
    hotel,
    vehicle,
    meals: ["Breakfast", "Dinner"],
    activities: ["Sightseeing", "Local transfers", "Guided tours", "Adventure activities"],
    placesToVisit,
    inclusions: [
      "Accommodation",
      "Private vehicle with driver",
      "Meals as per plan",
      "Sightseeing",
      "All taxes",
    ],
    exclusions: ["Flights", "Personal expenses", "Entry tickets not mentioned"],
    highlights: [
      `Best of ${destination}`,
      "Handpicked hotels",
      "Flexible itinerary",
      "24/7 support",
    ],
    images,
    imagePrompts: [
      {
        label: "Destination Hero",
        prompt: `Stunning hero banner of ${destination} mountains and valleys, travel photography`,
        url: images[0],
      },
      {
        label: "Hotel",
        prompt: `Luxury hotel room in ${destination}, warm lighting`,
        url: images[1],
      },
      {
        label: "Vehicle",
        prompt: `${vehicle.name} on scenic ${destination} road`,
      },
      {
        label: "Activities",
        prompt: `Adventure activities in ${destination}, tourists enjoying`,
      },
    ],
    seoMeta: buildSeoMeta(destination, title, slug),
    faq: buildSeoMeta(destination, title, slug).faq,
    priceBreakdown,
    price: priceBreakdown.finalPrice,
    category,
    slug,
  };
}
