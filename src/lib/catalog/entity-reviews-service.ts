import "server-only";

import {
  generateCatalogReviews,
  type CatalogReviewInput,
} from "@/lib/catalog/catalog-reviews";
import { getPublicReviews } from "@/lib/ai-center/phase3-repository";
import type { Review } from "@/types";

export async function getEntityReviews(input: CatalogReviewInput): Promise<Review[]> {
  const generated = generateCatalogReviews(input);

  try {
    const live = (await getPublicReviews()).filter(
      (review) =>
        review.serviceType === input.serviceType && review.serviceId === input.serviceId
    );

    if (live.length === 0) return generated;

    const liveIds = new Set(live.map((review) => review.id));
    const filler = generated.filter((review) => !liveIds.has(review.id));
    const merged = [...live, ...filler].slice(0, input.reviewCount);

    if (merged.length >= input.reviewCount) return merged;
    return generated;
  } catch {
    return generated;
  }
}
