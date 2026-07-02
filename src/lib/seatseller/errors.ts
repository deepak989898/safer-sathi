export function formatSeatSellerHttpError(status: number, body: unknown): string {
  const text =
    typeof body === "string"
      ? body
      : body && typeof body === "object" && "message" in body
        ? String((body as { message: string }).message)
        : "";

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
