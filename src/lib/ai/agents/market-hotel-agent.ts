import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { addHotelDraft, hotelSlugExists, reloadHotelsStore } from "@/lib/hotel-store";
import { routeCompletion } from "@/lib/ai/router";
import type { Hotel, HotelRoom } from "@/types";

export interface MarketHotelInput {
  city: string;
  starRating?: number;
  locale?: "en" | "hi";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildRooms(starRating: number): HotelRoom[] {
  const base = 2500 + starRating * 800;
  return [
    {
      id: "r1",
      name: { en: "Deluxe Room", hi: "डीलक्स कमरा" },
      type: "Deluxe",
      pricePerNight: base,
      maxGuests: 2,
      available: true,
      amenities: ["AC", "TV", "WiFi"],
      images: [],
    },
    {
      id: "r2",
      name: { en: "Family Suite", hi: "फैमिली सुइट" },
      type: "Suite",
      pricePerNight: Math.round(base * 1.6),
      maxGuests: 4,
      available: true,
      amenities: ["AC", "Living area", "Balcony"],
      images: [],
    },
  ];
}

function ruleBasedMarketHotel(input: MarketHotelInput): Hotel {
  const city = input.city.trim() || "Goa";
  const stars = input.starRating ?? 4;
  const name = `${city} Premium ${stars}-Star Hotel`;
  const slugBase = slugify(`${city}-hotel-${stars}star`);
  let slug = slugBase;
  let suffix = 1;
  while (hotelSlugExists(slug)) {
    slug = `${slugBase}-${suffix++}`;
  }

  const rooms = buildRooms(stars);
  const priceFrom = rooms[0]?.pricePerNight ?? 3500;
  const now = new Date().toISOString();

  return {
    id: `hotel_ai_${Date.now()}`,
    name: { en: name, hi: `${city} प्रीमियम होटल` },
    slug,
    starRating: stars,
    location: `${city} City Center`,
    city,
    state: "",
    country: "India",
    images: [TRAVEL_IMAGES.hotelLuxury, TRAVEL_IMAGES.beachResort],
    amenities: ["WiFi", "Pool", "Restaurant", "Parking", "Room Service", "AC"],
    description: {
      en: `AI-researched ${stars}-star hotel in ${city}. From ₹${priceFrom.toLocaleString("en-IN")}/night with premium amenities and central location.`,
      hi: `${city} में ${stars} सितारा होटल — ₹${priceFrom.toLocaleString("en-IN")}/रात से।`,
    },
    priceFrom,
    rooms,
    rating: 4.4,
    reviewCount: 0,
    featured: false,
    status: "inactive",
    available: false,
    publishStatus: "pending_approval",
    marketAnalysis: {
      en: `Comparable ${stars}-star hotels in ${city} typically range ₹${Math.round(priceFrom * 0.85).toLocaleString("en-IN")}–₹${Math.round(priceFrom * 1.35).toLocaleString("en-IN")} per night.`,
      hi: `${city} में ${stars} सितारा होटल की बाजार दर के अनुरूप।`,
    },
    proposedBy: "ai_market_agent",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runMarketHotelAgent(
  input: MarketHotelInput
): Promise<{ hotel: Hotel; provider: string }> {
  await reloadHotelsStore();
  const city = input.city.trim() || "Goa";
  const stars = input.starRating ?? 4;

  const { content, provider } = await routeCompletion(
    `You are Safar Sathi hotel market analyst for India. Summarize competitive hotel pricing in 2 sentences.`,
    [
      {
        role: "user",
        content: `City: ${city}, Star rating: ${stars}. Suggest fair market positioning.`,
      },
    ],
    async () =>
      `Market scan: ${stars}-star hotels in ${city} are competitively priced for leisure and business travelers.`
  );

  const draft = ruleBasedMarketHotel(input);
  draft.marketAnalysis = { en: content, hi: content };
  const saved = await addHotelDraft(draft);
  return { hotel: saved, provider };
}
