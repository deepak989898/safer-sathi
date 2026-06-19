import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  getAdminHotels,
  hydrateHotelsStore,
  seedHotels,
  upsertHotelInStore,
} from "@/lib/hotel-store";
import { HOTELS_SEED_COUNT } from "@/data/hotels-seed";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Hotel, HotelStatus } from "@/types";

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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "seed") {
      const { data: body, error } = await parseJsonBody(request);
      if (error) return error;
      const parsed = z.object({ actorRole: actorRoleSchema }).safeParse(body);
      if (!parsed.success) {
        return apiError("Validation failed", 400, parsed.error.flatten());
      }
      if (!requireStaffRole(parsed.data.actorRole)) {
        return apiError("Only admin and manager can seed hotels", 403);
      }
      const saved = await seedHotels();
      return apiSuccess({
        message: `Seeded ${saved.length} hotels`,
        count: saved.length,
        expected: HOTELS_SEED_COUNT,
      });
    }

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
    const status = (input.status ?? "active") as HotelStatus;
    const hotel: Hotel = {
      id: input.id ?? `h_${Date.now()}`,
      name: input.name ?? { en: "New Hotel", hi: "नया होटल" },
      slug: input.slug ?? `hotel-${Date.now()}`,
      starRating: input.starRating ?? 3,
      location: input.location ?? "",
      address: input.address,
      city: input.city ?? "Delhi",
      state: input.state,
      country: input.country ?? "India",
      images: input.images ?? [],
      amenities: input.amenities ?? [],
      description: input.description ?? { en: "", hi: "" },
      priceFrom: input.priceFrom ?? 3000,
      rooms: input.rooms ?? [],
      rating: input.rating ?? 0,
      reviewCount: input.reviewCount ?? 0,
      featured: input.featured ?? false,
      status,
      available: input.available ?? status === "active",
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const saved = await upsertHotelInStore(hotel);
    return apiSuccess(saved, 201);
  } catch (err) {
    console.error("Create/seed hotel error:", err);
    return apiError("Failed to process hotel request", 500);
  }
}
