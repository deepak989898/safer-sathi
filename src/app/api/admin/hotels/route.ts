import { actorRoleSchema } from "@/lib/admin/api-auth";
import {
  getAdminHotels,
  hydrateHotelsStore,
  upsertHotelInStore,
} from "@/lib/hotel-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";
import { requireStaffRole } from "@/lib/admin/api-auth";
import type { Hotel } from "@/types";

export async function GET() {
  try {
    await hydrateHotelsStore();
    return apiSuccess(getAdminHotels());
  } catch (err) {
    console.error("List hotels error:", err);
    return apiError("Failed to list hotels", 500);
  }
}

const createSchema = z.object({
  actorRole: actorRoleSchema,
  hotel: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }
    if (!requireStaffRole(parsed.data.actorRole)) {
      return apiError("Forbidden", 403);
    }

    await hydrateHotelsStore();
    const now = new Date().toISOString();
    const input = parsed.data.hotel as Partial<Hotel>;
    const hotel: Hotel = {
      id: input.id ?? `h_${Date.now()}`,
      name: input.name ?? { en: "New Hotel", hi: "नया होटल" },
      slug: input.slug ?? `hotel-${Date.now()}`,
      starRating: input.starRating ?? 3,
      location: input.location ?? "",
      city: input.city ?? "Delhi",
      images: input.images ?? [],
      amenities: input.amenities ?? [],
      description: input.description ?? { en: "", hi: "" },
      priceFrom: input.priceFrom ?? 3000,
      rooms: input.rooms ?? [],
      rating: input.rating ?? 0,
      reviewCount: input.reviewCount ?? 0,
      available: input.available ?? true,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const saved = await upsertHotelInStore(hotel);
    return apiSuccess(saved, 201);
  } catch (err) {
    console.error("Create hotel error:", err);
    return apiError("Failed to create hotel", 500);
  }
}
