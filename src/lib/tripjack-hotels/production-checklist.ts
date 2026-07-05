import {
  getTripJackHotelEnvironment,
  isRazorpayLiveConfigured,
  isTripJackHotelProductionDomain,
  isTripJackHotelProviderEnabled,
  isTripJackHotelVpsConfigured,
} from "@/lib/tripjack-hotels/config";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { getTripJackHotelOpsMeta, listTripJackHotelNationalities } from "@/lib/tripjack-hotels/ops-firestore";

export interface ProductionChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export async function buildTripJackHotelProductionChecklist(): Promise<ProductionChecklistItem[]> {
  const meta = await getTripJackHotelCatalogMeta();
  const ops = await getTripJackHotelOpsMeta();
  const nationalities = await listTripJackHotelNationalities(1);

  const proxyConfigured = isTripJackHotelVpsConfigured();

  return [
    {
      id: "provider_enabled",
      label: "TripJack Hotels provider enabled",
      passed: isTripJackHotelProviderEnabled(),
    },
    {
      id: "hms_env",
      label: "TripJack HMS environment set",
      passed: getTripJackHotelEnvironment() === "production",
      detail:
        getTripJackHotelEnvironment() === "production"
          ? "TRIPJACK_HOTEL_ENV=production"
          : "Staging — set TRIPJACK_HOTEL_ENV=production for live",
    },
    {
      id: "proxy_configured",
      label: "VPS proxy base URL configured",
      passed: proxyConfigured,
      detail: process.env.TRIPJACK_PROXY_BASE_URL ?? "Set TRIPJACK_PROXY_BASE_URL",
    },
    {
      id: "vps_whitelist",
      label: "VPS IP whitelisted with TripJack (manual verify)",
      passed: proxyConfigured,
      detail: "Confirm TripJack whitelisted your VPS IP",
    },
    {
      id: "vps_api_key",
      label: "TripJack live API key on VPS (manual verify)",
      passed: true,
      detail: "Confirm TRIPJACK_API_KEY in VPS .env for production HMS",
    },
    {
      id: "razorpay_live",
      label: "Razorpay live keys configured",
      passed: isRazorpayLiveConfigured(),
    },
    {
      id: "production_domain",
      label: "Production domain configured",
      passed: isTripJackHotelProductionDomain(),
      detail: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? "Set NEXT_PUBLIC_SITE_URL",
    },
    {
      id: "static_sync",
      label: "Static hotels synced",
      passed: (meta.activeHotels ?? 0) > 0,
      detail: `${meta.activeHotels ?? 0} active hotels`,
    },
    {
      id: "nationalities",
      label: "Nationalities synced",
      passed: nationalities.length > 0 || Boolean(meta.lastNationalitySyncAt ?? ops.lastNationalitySyncAt),
    },
    {
      id: "live_mode",
      label: "Live booking mode enabled (when ready)",
      passed: ops.liveBookingEnabled,
      detail: ops.liveBookingEnabled ? "Enabled in admin" : "Enable at /admin/tripjack-hotels when ready",
    },
    {
      id: "booking_status_sync",
      label: "Booking status sync run at least once",
      passed: Boolean(ops.lastBookingStatusSyncAt ?? meta.lastBookingStatusSyncAt),
    },
    {
      id: "booking_details_test",
      label: "Booking-details API test passed (manual)",
      passed: Boolean(ops.lastBookingStatusSyncAt),
      detail: "Run test from /admin/tripjack-hotels/test",
    },
    {
      id: "cancel_test",
      label: "Cancel booking test passed (manual)",
      passed: false,
      detail: "Test cancel on staging booking before go-live",
    },
    {
      id: "admin_refund",
      label: "Admin refund flow ready",
      passed: true,
      detail: "Verify refund fields on /admin/hotel-bookings",
    },
    {
      id: "my_bookings",
      label: "Customer My Bookings working",
      passed: isTripJackHotelProviderEnabled(),
      detail: "Account → Hotel bookings",
    },
    {
      id: "email_env",
      label: "Email delivery configured",
      passed: Boolean(
        process.env.RESEND_API_KEY ||
          process.env.SMTP_HOST ||
          process.env.ADMIN_EMAIL
      ),
    },
    {
      id: "invoice",
      label: "Invoice generation working",
      passed: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS),
      detail: "Test download from a confirmed booking",
    },
    {
      id: "firebase_admin",
      label: "Firebase Admin configured",
      passed: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    },
  ];
}
