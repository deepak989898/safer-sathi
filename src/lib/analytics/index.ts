export { GA_MEASUREMENT_ID, CLARITY_PROJECT_ID, ANALYTICS_ENABLED } from "@/lib/analytics/config";
export { AnalyticsEvents, type AnalyticsEventName, type AnalyticsEventParams } from "@/lib/analytics/events";
export { isGaEnabled, pageview, trackEvent, trackPurchase } from "@/lib/analytics/gtag";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/gtag";

export function trackPackageView(slug: string, name: string, price?: number) {
  trackEvent(AnalyticsEvents.VIEW_PACKAGE, {
    item_id: slug,
    item_name: name,
    service_type: "package",
    value: price,
  });
}

export function trackHotelView(slug: string, name: string, price?: number) {
  trackEvent(AnalyticsEvents.VIEW_HOTEL, {
    item_id: slug,
    item_name: name,
    service_type: "hotel",
    value: price,
  });
}

export function trackVehicleView(id: string, name: string, price?: number) {
  trackEvent(AnalyticsEvents.VIEW_VEHICLE, {
    item_id: id,
    item_name: name,
    service_type: "vehicle",
    value: price,
  });
}

export function trackBlogView(slug: string, title: string) {
  trackEvent(AnalyticsEvents.BLOG_VIEW, { item_id: slug, item_name: title });
}

export function trackAiAssistantOpen() {
  trackEvent(AnalyticsEvents.AI_ASSISTANT_OPEN);
}

export function trackAiAssistantMessage(intent?: string) {
  trackEvent(AnalyticsEvents.AI_ASSISTANT_MESSAGE, { item_category: intent });
}

export function trackBookingStarted(serviceType: string, serviceId: string, amount?: number) {
  trackEvent(AnalyticsEvents.BOOKING_STARTED, {
    service_type: serviceType as "package" | "hotel" | "vehicle",
    item_id: serviceId,
    value: amount,
  });
}

export function trackBookingCompleted(
  serviceType: string,
  bookingId: string,
  amount: number,
  paymentPlan?: string
) {
  trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
    service_type: serviceType as "package" | "hotel" | "vehicle",
    item_id: bookingId,
    value: amount,
    payment_plan: paymentPlan,
  });
}

export function trackPaymentSuccess(amount: number, bookingId: string, serviceType?: string) {
  trackEvent(AnalyticsEvents.PAYMENT_SUCCESS, {
    value: amount,
    item_id: bookingId,
    service_type: serviceType as "package" | "hotel" | "vehicle" | undefined,
  });
}

export function trackPaymentFailed(reason: string, bookingId?: string) {
  trackEvent(AnalyticsEvents.PAYMENT_FAILED, {
    item_name: reason,
    item_id: bookingId,
  });
}

export function trackBookingAbandoned(step: string, serviceType?: string) {
  trackEvent(AnalyticsEvents.BOOKING_ABANDONED, {
    item_category: step,
    service_type: serviceType as "package" | "hotel" | "vehicle" | undefined,
  });
}
