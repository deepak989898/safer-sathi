import { asRecord, pickString } from "@/lib/seatseller/normalize";

export function extractSeatSellerErrorMessage(body: unknown, status = 500): string {
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (trimmed) return trimmed.slice(0, 500);
    return `SeatSeller API error (HTTP ${status})`;
  }

  const record = asRecord(body);
  if (!record) return `SeatSeller API error (HTTP ${status})`;

  const message = pickString(
    record,
    ["error", "Error", "message", "errorMessage", "error_description", "description"],
    ""
  );
  if (message) return message.slice(0, 500);

  return `SeatSeller API error (HTTP ${status})`;
}

export function formatSeatSellerHttpError(status: number, body: unknown): string {
  const text = extractSeatSellerErrorMessage(body, status);
  const trimmed = text.trim();

  if (trimmed.includes("OAUTH verification failed")) {
    return "SeatSeller OAuth verification failed. Check SEATSELLER_CONSUMER_KEY and SEATSELLER_CONSUMER_SECRET in Vercel env.";
  }

  if (trimmed.startsWith("<!") || trimmed.includes("<html") || trimmed.includes("<title>")) {
    if (status === 403) {
      return [
        "SeatSeller returned 403 Forbidden.",
        "Common causes:",
        "1) Test API key may not have access to this endpoint (e.g. availabletrips) until SeatSeller enables it.",
        "2) Your server IP must be whitelisted — share Vercel egress IPs with SeatSeller support.",
        "3) Verify credentials match the email from SeatSeller exactly.",
      ].join(" ");
    }
    return `SeatSeller returned HTTP ${status}. Check credentials and contact SeatSeller if cities sync works but trips do not.`;
  }

  if (trimmed) return trimmed.slice(0, 400);
  return `SeatSeller API error (HTTP ${status})`;
}
