import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { updateTripJackHotelCatalogVisibility } from "@/lib/tripjack-hotels/catalog-firestore";

export async function PATCH(request: Request) {
  const auth = await requireStaffAuth(request);
  if ("error" in auth) return auth.error;

  const { data: body, error } = await parseJsonBody(request);
  if (error) return error;

  const hid = Number((body as { hid?: unknown })?.hid);
  if (!Number.isFinite(hid) || hid <= 0) {
    return apiError("Valid TripJack hotel ID (hid) is required", 400);
  }
  const websiteVisible = (body as { websiteVisible?: unknown })?.websiteVisible;
  if (typeof websiteVisible !== "boolean") {
    return apiError("websiteVisible boolean is required", 400);
  }

  const entry = await updateTripJackHotelCatalogVisibility(hid, websiteVisible);
  if (!entry) {
    return apiError(`Hotel catalog entry not found for HID ${hid}`, 404);
  }

  return apiSuccess({
    entry: {
      tjHotelId: entry.tjHotelId,
      name: entry.name,
      websiteVisible: entry.websiteVisible !== false,
    },
    message: websiteVisible
      ? `Hotel ${hid} is now visible on the website`
      : `Hotel ${hid} is now hidden from the website`,
  });
}
