import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  buildLocationFromBrowser,
  getClientIp,
} from "@/lib/ai/travel-manager/ip-geolocation";
import type { Locale } from "@/types";
import type { AiAssistantEnquiry } from "@/types/ai-enquiry";
import type { TravelManagerState, UserLocationInfo } from "@/types/travel-manager";

const COLLECTION = "ai_assistant_enquiries";

/** Firestore rejects documents containing undefined field values. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

function resolveEnquiryLocation(
  request: Request,
  state?: TravelManagerState,
  timezone?: string
): UserLocationInfo {
  if (state?.userLocation?.city || state?.userLocation?.state) {
    return state.userLocation;
  }

  const fromBrowser = buildLocationFromBrowser({
    timezone,
    browserLanguage: undefined,
  });
  if (fromBrowser) return fromBrowser;

  const ip = getClientIp(request);
  return {
    country: "India",
    source: "default",
    region: "other",
    ip: ip ?? undefined,
  };
}

function formatTimeLabel(iso: string, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("en-IN");
  }
}

function buildLocationReadable(loc?: {
  city?: string;
  state?: string;
  country?: string;
}): string {
  const parts = [loc?.city, loc?.state, loc?.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unknown";
}

export async function logAiAssistantEnquiry(input: {
  request: Request;
  userMessage: string;
  aiReply?: string;
  locale: Locale;
  state?: TravelManagerState;
  context?: { userId?: string; guestId?: string; timezone?: string };
  packagePrice?: number;
}): Promise<void> {
  if (
    !input.userMessage ||
    input.userMessage === "__refresh__" ||
    input.userMessage === "__init__"
  ) {
    return;
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const dateKey = createdAt.slice(0, 10);

  const location = resolveEnquiryLocation(
    input.request,
    input.state,
    input.context?.timezone
  );

  const ip = getClientIp(input.request) ?? location.ip;

  const enquiry = omitUndefined({
    createdAt,
    dateKey,
    timeLabel: formatTimeLabel(createdAt, location?.timezone ?? input.context?.timezone),
    ip,
    ipAddress: ip ? `IP ${ip}` : undefined,
    locationReadable: buildLocationReadable(location),
    city: location?.city,
    state: location?.state,
    country: location?.country,
    timezone: location?.timezone ?? input.context?.timezone,
    locale: input.locale,
    userId: input.context?.userId,
    guestId: input.context?.guestId,
    userMessage: input.userMessage.slice(0, 500),
    aiReply: input.aiReply?.slice(0, 800),
    step: input.state?.step,
    intent: input.state?.intent,
    destination: input.state?.destination,
    pickupCity: input.state?.pickupCity,
    tripType: input.state?.tripType,
    durationDays: input.state?.durationDays,
    selectedTierId: input.state?.selectedTierId,
    packagePrice: input.packagePrice,
    customerName: input.state?.customerName,
    customerEmail: input.state?.customerEmail,
    customerPhone: input.state?.customerPhone,
    status:
      input.state?.step === "payment" || input.state?.step === "confirmed"
        ? "converted"
        : "active",
  } satisfies Omit<AiAssistantEnquiry, "id">);

  if (!isAdminEnvConfigured()) {
    console.warn("logAiAssistantEnquiry skipped: Firebase Admin not configured");
    return;
  }

  try {
    const db = await getSafeAdminDb();
    if (!db) {
      console.warn("logAiAssistantEnquiry skipped: Admin DB unavailable");
      return;
    }
    await db.collection(COLLECTION).add(enquiry);
  } catch (error) {
    console.error("logAiAssistantEnquiry failed:", error);
  }
}

export async function listAiAssistantEnquiries(limit = 200): Promise<AiAssistantEnquiry[]> {
  if (!isAdminEnvConfigured()) return [];

  try {
    const db = await getSafeAdminDb();
    if (!db) return [];

    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AiAssistantEnquiry, "id">),
    }));
  } catch (error) {
    console.error("listAiAssistantEnquiries orderBy failed, retrying:", error);
    try {
      const db = await getSafeAdminDb();
      if (!db) return [];
      const snap = await db.collection(COLLECTION).limit(limit).get();
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AiAssistantEnquiry, "id">),
      }));
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (retryError) {
      console.error("listAiAssistantEnquiries failed:", retryError);
      return [];
    }
  }
}

export type { AiAssistantEnquiry };
