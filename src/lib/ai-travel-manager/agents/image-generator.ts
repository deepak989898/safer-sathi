import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { saveGeneratedImage } from "@/lib/ai-travel-manager/repository";
import type { AIGeneratedImage } from "@/lib/ai-travel-manager/types";

const IMAGE_MAP = {
  package_cover: TRAVEL_IMAGES.hotelLuxury,
  destination_banner: TRAVEL_IMAGES.keralaBackwaters,
  hotel_promo: TRAVEL_IMAGES.hotelLuxury,
  vehicle_banner: TRAVEL_IMAGES.suv,
  social_media: TRAVEL_IMAGES.goldenTriangle,
} as const;

export async function generateAIImages(input: {
  relatedId: string;
  destination: string;
  types?: Array<keyof typeof IMAGE_MAP>;
}): Promise<AIGeneratedImage[]> {
  const types = input.types ?? ["package_cover", "destination_banner", "social_media"];
  const now = new Date().toISOString();
  const results: AIGeneratedImage[] = [];

  for (const type of types) {
    const image: AIGeneratedImage = {
      id: `img_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      url: IMAGE_MAP[type].replace("w=800", "w=1920"),
      relatedId: input.relatedId,
      prompt: `${type} for ${input.destination}`,
      createdAt: now,
    };
    results.push(await saveGeneratedImage(image));
  }

  return results;
}
