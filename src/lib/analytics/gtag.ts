import { GA_MEASUREMENT_ID } from "@/lib/analytics/config";
import type { AnalyticsEventName, AnalyticsEventParams } from "@/lib/analytics/events";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "js" | "set",
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export function isGaEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

export function pageview(url: string, title?: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title,
  });
}

export function trackEvent(event: AnalyticsEventName | string, params?: AnalyticsEventParams) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, {
    currency: "INR",
    ...params,
  });
}

export function trackPurchase(value: number, params?: AnalyticsEventParams) {
  trackEvent("purchase", { value, currency: "INR", ...params });
}
