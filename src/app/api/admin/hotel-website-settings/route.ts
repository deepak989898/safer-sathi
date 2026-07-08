import { requireStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  getHotelWebsiteSettings,
  updateHotelWebsiteSettings,
} from "@/lib/hotels/website-settings";

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request);
  if ("error" in auth) return auth.error;

  const settings = await getHotelWebsiteSettings();
  return apiSuccess({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffAuth(request);
  if ("error" in auth) return auth.error;

  const { data: body, error } = await parseJsonBody(request);
  if (error) return error;

  const payload = (body ?? {}) as {
    manualHotelsWebsiteEnabled?: boolean;
    tripjackHotelsWebsiteEnabled?: boolean;
    hotelMarkupPercent?: number;
  };

  const patch: {
    manualHotelsWebsiteEnabled?: boolean;
    tripjackHotelsWebsiteEnabled?: boolean;
    hotelMarkupPercent?: number;
  } = {};

  if (typeof payload.manualHotelsWebsiteEnabled === "boolean") {
    patch.manualHotelsWebsiteEnabled = payload.manualHotelsWebsiteEnabled;
  }
  if (typeof payload.tripjackHotelsWebsiteEnabled === "boolean") {
    patch.tripjackHotelsWebsiteEnabled = payload.tripjackHotelsWebsiteEnabled;
  }
  if (typeof payload.hotelMarkupPercent === "number" && Number.isFinite(payload.hotelMarkupPercent)) {
    patch.hotelMarkupPercent = Math.max(0, Math.min(50, payload.hotelMarkupPercent));
  }

  if (!Object.keys(patch).length) {
    return apiError("No valid settings provided", 400);
  }

  const settings = await updateHotelWebsiteSettings(patch);
  return apiSuccess({ settings });
}
