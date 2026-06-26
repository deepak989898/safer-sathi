import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  generateTourPackage,
  getTourPackageStats,
  hydrateTourPackagesStore,
  listTourPackages,
} from "@/lib/ai-center/package-repository";
import { getAdminHotels, hydrateHotelsStore } from "@/lib/hotel-store";
import { getAdminVehicles, hydrateVehiclesStore } from "@/lib/vehicle-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    await Promise.all([
      hydrateTourPackagesStore(),
      hydrateHotelsStore(),
      hydrateVehiclesStore(),
    ]);

    const status = searchParams.get("status") as
      | "draft"
      | "pending_approval"
      | "approved"
      | "published"
      | "rejected"
      | null;

    return apiSuccess({
      packages: listTourPackages(status ?? undefined),
      stats: getTourPackageStats(),
      hotels: getAdminHotels().map((h) => ({
        id: h.id,
        name: h.name.en,
        city: h.city,
        priceFrom: h.priceFrom,
      })),
      vehicles: getAdminVehicles().map((v) => ({
        id: v.id,
        name: v.name.en,
        type: v.type,
        seats: v.seats,
        pricePerDay: v.pricePerDay,
      })),
    });
  } catch (err) {
    console.error("List AI packages error:", err);
    return apiError("Failed to list packages", 500);
  }
}

const generateSchema = z.object({
  destination: z.string().min(2),
  durationDays: z.number().int().min(2).max(14).optional(),
  hotelId: z.string().optional(),
  vehicleId: z.string().optional(),
  useGeneratedHotel: z.boolean().optional(),
  useGeneratedVehicle: z.boolean().optional(),
  travelers: z.number().int().min(1).max(20).optional(),
  marginPercent: z.number().min(5).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const pkg = await generateTourPackage({
      ...parsed.data,
      createdBy: auth.user.id,
    });
    return apiSuccess({ package: pkg });
  } catch (err) {
    console.error("Generate package error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate package", 500);
  }
}
