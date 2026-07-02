import { requireStaffAuth } from "@/lib/admin/api-auth";
import { busApiError } from "@/lib/bus/api-helpers";
import { apiSuccess } from "@/lib/api-response";
import { getSeatSellerConfig, isSeatSellerConfigured } from "@/lib/seatseller/config";
import { SeatSellerApiError, fetchCities, fetchAvailableTrips } from "@/lib/seatseller/client";
import { findBusCityByName } from "@/lib/bus/firestore";

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { baseUrl, env } = getSeatSellerConfig();
    const configured = isSeatSellerConfigured();

    const report: Record<string, unknown> = {
      configured,
      baseUrl,
      env,
      keyPrefix: process.env.SEATSELLER_CONSUMER_KEY?.slice(0, 6) ?? null,
      checkedAt: new Date().toISOString(),
    };

    if (!configured) {
      return apiSuccess({
        ...report,
        cities: { ok: false, error: "SeatSeller keys not configured" },
        availableTrips: { ok: false, error: "SeatSeller keys not configured" },
      });
    }

    try {
      const cities = await fetchCities();
      report.cities = { ok: true, count: cities.length };
    } catch (error) {
      report.cities = {
        ok: false,
        error: error instanceof SeatSellerApiError ? error.message : String(error),
        statusCode: error instanceof SeatSellerApiError ? error.statusCode : undefined,
      };
    }

    const bangalore = await findBusCityByName("Bangalore");
    const hyderabad = await findBusCityByName("Hyderabad");

    if (!bangalore || !hyderabad) {
      report.availableTrips = {
        ok: false,
        error: "Bangalore or Hyderabad not found in busCities — run Sync bus cities first.",
        bangaloreId: bangalore?.id ?? null,
        hyderabadId: hyderabad?.id ?? null,
      };
      return apiSuccess(report);
    }

    const doj = addDaysIso(1);
    try {
      const result = await fetchAvailableTrips({
        source: bangalore.id,
        destination: hyderabad.id,
        doj,
      });
      report.availableTrips = {
        ok: true,
        route: "Bangalore → Hyderabad",
        sourceId: bangalore.id,
        destinationId: hyderabad.id,
        doj,
        count: result.trips.length,
        apiUrl: result.apiUrl,
        journeyDateSentToApi: result.journeyDateSentToApi,
      };
    } catch (error) {
      report.availableTrips = {
        ok: false,
        route: "Bangalore → Hyderabad",
        sourceId: bangalore.id,
        destinationId: hyderabad.id,
        doj,
        error: error instanceof SeatSellerApiError ? error.message : String(error),
        statusCode: error instanceof SeatSellerApiError ? error.statusCode : undefined,
        hint:
          "If cities works but this fails with 403, ask SeatSeller to enable availabletrips for your test key and whitelist Vercel server IPs.",
      };
    }

    return apiSuccess(report);
  } catch (error) {
    return busApiError(error, "Connection test failed");
  }
}
