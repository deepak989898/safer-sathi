import { apiSuccess } from "@/lib/api-response";
import { getHotelWebsiteSettings } from "@/lib/hotels/website-settings";

export async function GET() {
  const settings = await getHotelWebsiteSettings();
  return apiSuccess({
    manualHotelsWebsiteEnabled: settings.manualHotelsWebsiteEnabled !== false,
    tripjackHotelsWebsiteEnabled: settings.tripjackHotelsWebsiteEnabled !== false,
  });
}
