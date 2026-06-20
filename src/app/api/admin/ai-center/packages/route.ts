import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
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
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

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
  actorRole: z.string(),
  actorId: z.string().optional(),
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
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    const pkg = await generateTourPackage({
      ...parsed.data,
      createdBy: parsed.data.actorId ?? "super_admin",
    });
    return apiSuccess({ package: pkg });
  } catch (err) {
    console.error("Generate package error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate package", 500);
  }
}
