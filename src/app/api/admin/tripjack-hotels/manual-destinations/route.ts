import { z } from "zod";
import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  deleteTripJackHotelManualDestination,
  listTripJackHotelManualDestinations,
  upsertTripJackHotelManualDestination,
} from "@/lib/tripjack-hotels/manual-destinations";

const upsertSchema = z.object({
  label: z.string().min(1),
  searchKeys: z.array(z.string()).default([]),
  hids: z.array(z.number().int().positive()).min(1),
  countryName: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const destinations = await listTripJackHotelManualDestinations();
    return apiSuccess({ destinations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load manual destinations";
    return apiError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const { data, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = upsertSchema.safeParse(data);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const destination = await upsertTripJackHotelManualDestination({
      ...parsed.data,
      updatedBy: auth.user.email,
    });

    return apiSuccess({ destination, message: "Manual destination saved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save manual destination";
    return apiError(message, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return apiError("id query param is required", 400);

    await deleteTripJackHotelManualDestination(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete manual destination";
    return apiError(message, 500);
  }
}
