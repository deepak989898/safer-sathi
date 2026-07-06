import { TripJackApiError } from "@/lib/tripjack/client";
import type { TripJackBookRequest } from "@/lib/tripjack/build-book";
import type { FlightBookErrorDetail } from "@/lib/flights/types";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

export function redactTripJackBookRequest(request: TripJackBookRequest): TripJackBookRequest {
  return {
    ...request,
    deliveryInfo: {
      emails: request.deliveryInfo.emails.map(maskEmail),
      contacts: request.deliveryInfo.contacts.map(maskPhone),
    },
    contactInfo: request.contactInfo
      ? {
          ...request.contactInfo,
          emails: request.contactInfo.emails.map(maskEmail),
          contacts: request.contactInfo.contacts.map(maskPhone),
        }
      : undefined,
  };
}

function previewRaw(raw: unknown): string {
  if (typeof raw === "string") return raw.slice(0, 800);
  try {
    return JSON.stringify(raw).slice(0, 800);
  } catch {
    return String(raw).slice(0, 800);
  }
}

export function captureFlightBookError(
  error: unknown,
  request: TripJackBookRequest,
  proxyUrl?: string
): FlightBookErrorDetail {
  const at = new Date().toISOString();

  if (error instanceof TripJackApiError) {
    const raw = error.raw;
    const record =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    return {
      message: error.message,
      upstreamStatus: error.statusCode ?? Number(record.status ?? record.upstreamStatus),
      upstreamUrl: String(record.upstreamUrl ?? proxyUrl ?? ""),
      rawPreview: previewRaw(raw),
      requestRedacted: redactTripJackBookRequest(request),
      response: raw,
      at,
    };
  }

  return {
    message: error instanceof Error ? error.message : "TripJack book failed",
    upstreamUrl: proxyUrl ?? "",
    rawPreview: previewRaw(error),
    requestRedacted: redactTripJackBookRequest(request),
    at,
  };
}
