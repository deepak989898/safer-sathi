import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  getAdminVehicles,
  hydrateVehiclesStore,
  upsertVehicleInStore,
} from "@/lib/vehicle-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Vehicle } from "@/types";

export async function GET() {
  try {
    await hydrateVehiclesStore();
    return apiSuccess(getAdminVehicles());
  } catch (err) {
    console.error("List vehicles error:", err);
    return apiError("Failed to list vehicles", 500);
  }
}

const createSchema = z.object({
  actorRole: actorRoleSchema,
  vehicle: z.record(z.string(), z.unknown()),
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
      return apiError("Only super admin and manager can manage vehicles", 403);
    }

    await hydrateVehiclesStore();
    const now = new Date().toISOString();
    const input = parsed.data.vehicle as Partial<Vehicle>;
    const vehicle: Vehicle = {
      id: input.id ?? `v_${Date.now()}`,
      name: input.name ?? { en: "New Vehicle", hi: "नया वाहन" },
      type: input.type ?? "suv",
      seats: input.seats ?? 4,
      pricePerDay: input.pricePerDay ?? 2000,
      pricePerKm: input.pricePerKm,
      images: input.images ?? [],
      available: input.available ?? true,
      fuelType: input.fuelType ?? "Petrol",
      driverIncluded: input.driverIncluded ?? true,
      description: input.description ?? { en: "", hi: "" },
      features: input.features ?? [],
      rating: input.rating ?? 0,
      reviewCount: input.reviewCount ?? 0,
      location: input.location ?? "Delhi",
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const saved = await upsertVehicleInStore(vehicle);
    return apiSuccess(saved, 201);
  } catch (err) {
    console.error("Create vehicle error:", err);
    return apiError("Failed to create vehicle", 500);
  }
}
