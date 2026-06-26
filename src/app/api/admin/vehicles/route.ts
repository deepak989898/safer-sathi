import { z } from "zod";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import {
  getAdminVehicles,
  reloadVehiclesStore,
  seedVehicles,
  upsertVehicleInStore,
} from "@/lib/vehicle-store";
import { VEHICLES_SEED_COUNT } from "@/data/vehicles-seed";
import { getFirebaseAdminStatus } from "@/lib/firebase/admin-safe";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Vehicle, VehicleStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    await reloadVehiclesStore();
    return apiSuccess({
      vehicles: getAdminVehicles(),
      firebase: getFirebaseAdminStatus(),
    });
  } catch (err) {
    console.error("List vehicles error:", err);
    return apiError("Failed to list vehicles", 500);
  }
}

const createSchema = z.object({
  vehicle: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "seed") {
      const saved = await seedVehicles();
      const published = saved.filter((v) => v.available).length;
      return apiSuccess({
        message: `Seeded ${saved.length} vehicles (${published} active on website)`,
        count: saved.length,
        published,
        expected: VEHICLES_SEED_COUNT,
      });
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    await reloadVehiclesStore();
    const now = new Date().toISOString();
    const input = parsed.data.vehicle as Partial<Vehicle>;
    const status = (input.status ?? "active") as VehicleStatus;
    const vehicle: Vehicle = {
      id: input.id ?? `v_${Date.now()}`,
      slug: input.slug,
      name: input.name ?? { en: "New Vehicle", hi: "नया वाहन" },
      brand: input.brand,
      category: input.category,
      type: input.type ?? "suv",
      seats: input.seats ?? 4,
      pricePerDay: input.pricePerDay ?? 2000,
      pricePerKm: input.pricePerKm,
      images: input.images ?? [],
      available: input.available ?? status === "active",
      status,
      fuelType: input.fuelType ?? "Petrol",
      driverIncluded: input.driverIncluded ?? true,
      description: input.description ?? { en: "", hi: "" },
      features: input.features ?? [],
      rating: input.rating ?? 0,
      reviewCount: input.reviewCount ?? 0,
      location: input.location ?? "Delhi",
      publishStatus: input.publishStatus ?? "published",
      proposedBy: input.proposedBy ?? "admin",
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const saved = await upsertVehicleInStore(vehicle);
    return apiSuccess(saved, 201);
  } catch (err) {
    console.error("Create/seed vehicle error:", err);
    return apiError("Failed to process vehicle request", 500);
  }
}
