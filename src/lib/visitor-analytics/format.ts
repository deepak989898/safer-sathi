export function parseTrafficSource(
  referrer: string,
  utmSource?: string,
  utmMedium?: string
): string {
  if (utmSource?.trim()) {
    const medium = utmMedium?.trim();
    return medium ? `${utmSource} / ${medium}` : utmSource;
  }
  if (!referrer?.trim()) return "Direct";

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("google.")) return "Google";
    if (host.includes("facebook.") || host === "fb.com" || host.includes("fb.me")) return "Facebook";
    if (host.includes("instagram.")) return "Instagram";
    if (host.includes("youtube.")) return "YouTube";
    if (host.includes("twitter.") || host === "t.co" || host.includes("x.com")) return "X / Twitter";
    if (host.includes("bing.")) return "Bing";
    if (host.includes("linkedin.")) return "LinkedIn";
    if (host.includes("whatsapp.")) return "WhatsApp";
    return host;
  } catch {
    return "Referral";
  }
}

export function parseDevice(userAgent: string): { device: string; browser: string } {
  const ua = userAgent || "";
  const device = /mobile|android|iphone|ipad|ipod/i.test(ua) ? "Mobile" : "Desktop";
  let browser = "Other";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  return { device, browser };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function formatEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function eventTypeLabel(type: string): string {
  switch (type) {
    case "page_view":
      return "Page view";
    case "click":
      return "Click";
    case "search":
      return "Search";
    case "exit":
      return "Left site";
    case "heartbeat":
      return "Active";
    default:
      return type;
  }
}
