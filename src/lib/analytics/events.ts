/** GA4 recommended + custom Safar Sathi events */
export const AnalyticsEvents = {
  PAGE_VIEW: "page_view",
  VIEW_PACKAGE: "view_package",
  VIEW_HOTEL: "view_hotel",
  VIEW_VEHICLE: "view_vehicle",
  VIEW_DESTINATION: "view_destination",
  AI_ASSISTANT_OPEN: "ai_assistant_open",
  AI_ASSISTANT_MESSAGE: "ai_assistant_message",
  BOOKING_STARTED: "booking_started",
  BOOKING_COMPLETED: "booking_completed",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  BOOKING_ABANDONED: "booking_abandoned",
  BLOG_VIEW: "blog_view",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export interface AnalyticsEventParams {
  page_path?: string;
  page_title?: string;
  item_id?: string;
  item_name?: string;
  item_category?: string;
  destination?: string;
  service_type?: "package" | "hotel" | "vehicle" | "other";
  value?: number;
  currency?: string;
  payment_plan?: string;
  locale?: string;
  [key: string]: string | number | boolean | undefined;
}
