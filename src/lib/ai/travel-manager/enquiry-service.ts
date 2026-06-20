import { sanitizeForFirestore } from "@/lib/catalog/persistence";
import {
  buildEnquiryDocument,
  type BuildEnquiryInput,
} from "@/lib/ai/travel-manager/build-enquiry-document";
import {
  buildLocationFromBrowser,
  getClientIp,
} from "@/lib/ai/travel-manager/ip-geolocation";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { AiAssistantEnquiry } from "@/types/ai-enquiry";
import type { TravelManagerState, UserLocationInfo } from "@/types/travel-manager";

const COLLECTION = "ai_assistant_enquiries";

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

export async function logAiAssistantEnquiry(
  input: BuildEnquiryInput & { request: Request }
): Promise<boolean> {
  if (
    !input.userMessage ||
    input.userMessage === "__refresh__" ||
    input.userMessage === "__init__"
  ) {
    return false;
  }

  const location =
    input.location ??
    resolveEnquiryLocation(input.request, input.state, input.context?.timezone);
  const ip = input.ip ?? getClientIp(input.request) ?? location.ip;

  const enquiry = sanitizeForFirestore(
    buildEnquiryDocument({
      ...input,
      ip,
      location,
    })
  );

  if (!isAdminEnvConfigured()) {
    console.warn("logAiAssistantEnquiry: Firebase Admin not configured");
    return false;
  }

  try {
    const db = await getSafeAdminDb();
    if (!db) {
      console.warn("logAiAssistantEnquiry: Admin DB unavailable");
      return false;
    }
    await db.collection(COLLECTION).add(enquiry);
    return true;
  } catch (error) {
    console.error("logAiAssistantEnquiry failed:", error);
    return false;
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

export function isAiEnquiryStorageConfigured(): boolean {
  return isAdminEnvConfigured();
}

export type { AiAssistantEnquiry };
