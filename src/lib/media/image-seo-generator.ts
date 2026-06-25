import type { KeywordCategory } from "@/lib/ai-center/types";

const BANNED_ALT_PATTERNS = [
  /^image\d*$/i,
  /^photo\d*$/i,
  /^travel\s*image$/i,
  /^destination\s*image$/i,
  /^picture$/i,
  /^img[_-]?\d*$/i,
];

export function isBannedAltText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 12) return true;
  return BANNED_ALT_PATTERNS.some((p) => p.test(trimmed));
}

function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** SEO file name: manali-rohtang-pass-snow-view.webp */
export function generateSeoFileName(
  destination: string,
  subject: string,
  context?: string
): string {
  const parts = [destination, subject, context]
    .filter((p): p is string => Boolean(p))
    .map(slugifyPart)
    .filter(Boolean);
  const stem = parts.join("-").slice(0, 72) || "safar-sathi-travel";
  return `${stem}.webp`;
}

/** ALT: Destination + Subject + Context (descriptive, never generic) */
export function generateImageAltText(input: {
  destination: string;
  subject: string;
  context?: string;
  season?: string;
}): string {
  const dest = input.destination.trim();
  const subject = input.subject.trim();
  const ctx = input.context?.trim();
  const season = input.season?.trim();

  let alt = "";
  if (ctx && season) {
    alt = `${subject} in ${dest} during ${season} — ${ctx}`;
  } else if (ctx) {
    alt = `${subject} in ${dest} — ${ctx}`;
  } else if (season) {
    alt = `${dest} ${subject.toLowerCase()} during ${season}`;
  } else {
    alt = `${subject} in ${dest} — travel guide by Safar Sathi`;
  }

  return alt.replace(/\s+/g, " ").trim();
}

/** SEO title attribute */
export function generateImageTitle(input: {
  destination: string;
  subject: string;
  action?: string;
}): string {
  const action = input.action?.trim();
  if (action) {
    return `${action} In ${input.destination} — ${input.subject}`;
  }
  return `Best View Of ${input.subject} ${input.destination}`.replace(/\s+/g, " ").trim();
}

/** Natural caption */
export function generateImageCaption(input: {
  destination: string;
  subject: string;
  detail?: string;
}): string {
  const detail = input.detail?.trim();
  if (detail) return `${detail} in ${input.destination}.`;
  return `Beautiful view of ${input.subject} in ${input.destination}.`;
}

export function buildImageKeywords(input: {
  destination: string;
  subject: string;
  category?: KeywordCategory;
  attraction?: string;
}): string[] {
  const keywords = new Set<string>();
  keywords.add(input.destination.toLowerCase());
  keywords.add(input.subject.toLowerCase());
  if (input.attraction) keywords.add(input.attraction.toLowerCase());
  if (input.category) keywords.add(input.category.replace(/_/g, " "));
  keywords.add("safar sathi");
  keywords.add("india travel");
  return [...keywords].filter((k) => k.length > 2);
}

/** Normalize external URLs for WebP, 16:9, min 1200px width */
export function optimizeImageUrl(url: string): string {
  if (!url?.trim()) return url;
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", "1200");
      parsed.searchParams.set("h", "675");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("fm", "webp");
      parsed.searchParams.set("q", "82");
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    } catch {
      return url;
    }
  }
  return url;
}

export function passesImageQualityGate(url: string): boolean {
  if (!url?.trim()) return false;
  const lower = url.toLowerCase();
  if (lower.includes("placeholder") || lower.includes("via.placeholder")) return false;
  if (lower.includes("watermark")) return false;
  if (/img_\d+\.(jpg|jpeg|png)/i.test(lower)) return false;
  if (/image\d+\.(jpg|jpeg|png|webp)/i.test(lower)) return false;
  return true;
}
