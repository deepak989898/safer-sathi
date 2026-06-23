import { appUrl } from "@/lib/site-config";

/** Static marketing pages included in sitemap and SEO coverage */
export const STATIC_SEO_PAGES = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/packages", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/hotels", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/vehicles", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/holiday-packages", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/car-rental", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/tempo-traveller", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/airport-pickup", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/bus-booking", priority: 0.75, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.85, changeFrequency: "daily" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.65, changeFrequency: "monthly" as const },
  { path: "/reviews", priority: 0.65, changeFrequency: "weekly" as const },
  { path: "/gallery", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/ai-assistant", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
] as const;

export function staticPageUrl(path: string): string {
  return appUrl(path);
}
