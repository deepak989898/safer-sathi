import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  getAdminPackages,
  hydratePackagesStore,
  seedTourPackages,
  upsertPackageInStore,
} from "@/lib/package-store";
import { TOUR_PACKAGES_COUNT } from "@/data/tour-packages-seed";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { PackagePublishStatus, TourPackage } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PackagePublishStatus | null;
    await hydratePackagesStore();
    const packages = getAdminPackages(status ?? undefined);
    return apiSuccess(packages);
  } catch (err) {
    console.error("List packages error:", err);
    return apiError("Failed to list packages", 500);
  }
}

const createSchema = z.object({
  actorRole: actorRoleSchema,
  package: z.record(z.string(), z.unknown()),
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
        return apiError("Only admin and manager can seed packages", 403);
      }
      const saved = await seedTourPackages();
      return apiSuccess({
        message: `Seeded ${saved.length} tour packages`,
        count: saved.length,
        expected: TOUR_PACKAGES_COUNT,
      });
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }
    if (!requireStaffRole(parsed.data.actorRole)) {
      return apiError("Only admin and manager can create packages", 403);
    }

    await hydratePackagesStore();
    const now = new Date().toISOString();
    const input = parsed.data.package as Partial<TourPackage>;
    const pkg: TourPackage = {
      id: input.id ?? `pkg_${Date.now()}`,
      title: input.title ?? { en: "New Package", hi: "नया पैकेज" },
      slug: input.slug ?? `package-${Date.now()}`,
      category: input.category ?? "domestic",
      duration: input.duration ?? 5,
      durationLabel: input.durationLabel ?? { en: "4 Nights / 5 Days", hi: "4 रातें / 5 दिन" },
      cities: input.cities ?? [],
      hotels: input.hotels ?? [],
      meals: input.meals ?? [],
      activities: input.activities ?? [],
      price: input.price ?? 0,
      originalPrice: input.originalPrice,
      images: input.images ?? [],
      description: input.description ?? { en: "", hi: "" },
      itinerary: input.itinerary ?? [],
      inclusions: input.inclusions ?? [],
      exclusions: input.exclusions ?? [],
      transport: input.transport,
      rating: input.rating ?? 4.5,
      reviewCount: input.reviewCount ?? 0,
      featured: input.featured ?? false,
      publishStatus: input.publishStatus ?? "published",
      proposedBy: "admin",
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    };

    const saved = await upsertPackageInStore(pkg);
    return apiSuccess(saved, 201);
  } catch (err) {
    console.error("Create/seed package error:", err);
    return apiError("Failed to process package request", 500);
  }
}
