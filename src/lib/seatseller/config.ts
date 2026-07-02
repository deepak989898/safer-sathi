export function getSeatSellerConfig() {
  const consumerKey = process.env.SEATSELLER_CONSUMER_KEY?.trim() ?? "";
  const consumerSecret = process.env.SEATSELLER_CONSUMER_SECRET?.trim() ?? "";
  const baseUrl = (
    process.env.SEATSELLER_BASE_URL ?? "http://api.seatseller.travel"
  ).replace(/\/$/, "");
  const env = process.env.SEATSELLER_ENV ?? "sandbox";

  return { consumerKey, consumerSecret, baseUrl, env };
}

export function isSeatSellerConfigured(): boolean {
  const { consumerKey, consumerSecret } = getSeatSellerConfig();
  return Boolean(consumerKey && consumerSecret);
}

export function isSeatSellerDemoMode(): boolean {
  return !isSeatSellerConfigured() || process.env.SEATSELLER_DEMO_MODE === "true";
}

/** SeatSeller expects dd-MMM-yyyy e.g. 26-Jun-2026 */
export function formatSeatSellerDoj(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function parseSeatSellerDoj(doj: string): string {
  const parsed = new Date(doj.replace(/-/g, " "));
  if (Number.isNaN(parsed.getTime())) return doj;
  return parsed.toISOString().slice(0, 10);
}

/** Some SeatSeller accounts accept dd-MM-yyyy. */
export function formatSeatSellerDojNumeric(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
