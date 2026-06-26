import type { Locale } from "@/types";
import type { AiAssistantEnquiry } from "@/types/ai-enquiry";
import type { TravelManagerState, UserLocationInfo } from "@/types/travel-manager";

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

export interface BuildEnquiryInput {
  userMessage: string;
  aiReply?: string;
  locale: Locale;
  state?: TravelManagerState;
  context?: { userId?: string; guestId?: string; visitorId?: string; deviceId?: string; timezone?: string };
  packagePrice?: number;
  ip?: string;
  location?: UserLocationInfo;
}

export function buildEnquiryDocument(
  input: BuildEnquiryInput
): Omit<AiAssistantEnquiry, "id"> {
  const now = new Date();
  const createdAt = now.toISOString();
  const dateKey = createdAt.slice(0, 10);
  const location = input.location ?? input.state?.userLocation;
  const timezone = location?.timezone ?? input.context?.timezone;

  return {
    createdAt,
    dateKey,
    timeLabel: formatTimeLabel(createdAt, timezone),
    ip: input.ip ?? location?.ip,
    ipAddress: input.ip ?? location?.ip ? `IP ${input.ip ?? location?.ip}` : undefined,
    locationReadable: buildLocationReadable(location),
    city: location?.city,
    state: location?.state,
    country: location?.country,
    timezone,
    locale: input.locale,
    userId: input.context?.userId,
    guestId: input.context?.guestId ?? input.context?.visitorId,
    visitorId: input.context?.visitorId ?? input.context?.guestId,
    deviceId: input.context?.deviceId,
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
  };
}

/** Remove undefined — Firestore rejects undefined field values. */
export function sanitizeEnquiryForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
