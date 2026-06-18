import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { saveHotelDraft, saveGeneratedImage } from "@/lib/ai-travel-manager/repository";
import type { AIHotelDraft } from "@/lib/ai-travel-manager/types";

export interface GenerateHotelInput {
  name?: string;
  city?: string;
  category?: string;
  starRating?: number;
  createdBy: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function generateHotelDraft(
  input: GenerateHotelInput
): Promise<AIHotelDraft> {
  const city = input.city?.trim() || "Goa";
  const name = input.name?.trim() || `${city} Beach Paradise Resort`;
  const stars = input.starRating ?? 4;
  const now = new Date().toISOString();
  const slug = slugify(name);

  const banner = await saveGeneratedImage({
    id: `img_h_${Date.now()}`,
    type: "hotel_promo",
    url: TRAVEL_IMAGES.hotelLuxury.replace("w=800", "w=1920"),
    relatedId: `hotel_${Date.now()}`,
    prompt: `Hotel promo for ${name}`,
    createdAt: now,
  });

  const draft: AIHotelDraft = {
    id: `ai_hotel_${Date.now()}`,
    name: { en: name, hi: name },
    slug,
    category: input.category ?? "Resort",
    location: `${city} City Center`,
    city,
    starRating: stars,
    description: {
      en: `Luxury ${stars}-star stay in ${city} with modern amenities and scenic views.`,
      hi: `${city} में ${stars} सितारा आरामदायक प्रवास।`,
    },
    amenities: ["WiFi", "Pool", "Restaurant", "Spa", "Parking", "Room Service"],
    rooms: [
      {
        id: "r1",
        name: { en: "Deluxe Room", hi: "डीलक्स कमरा" },
        type: "Deluxe",
        pricePerNight: 4500 + stars * 500,
        maxGuests: 2,
        amenities: ["AC", "TV", "Mini Bar"],
      },
      {
        id: "r2",
        name: { en: "Family Suite", hi: "फैमिली सुइट" },
        type: "Suite",
        pricePerNight: 7500 + stars * 500,
        maxGuests: 4,
        amenities: ["AC", "Living area", "Balcony"],
      },
    ],
    priceFrom: 4500 + stars * 500,
    includedFacilities: ["Breakfast", "WiFi", "Airport shuttle on request"],
    images: [banner.url, TRAVEL_IMAGES.beachResort],
    approvalStatus: "draft",
    generatedImages: [banner],
    proposedBy: "ai_travel_manager",
    createdAt: now,
    updatedAt: now,
  };

  banner.relatedId = draft.id;
  return saveHotelDraft(draft);
}
