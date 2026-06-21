/** GA4 Measurement ID — set NEXT_PUBLIC_GA_ID in .env.local */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID?.trim() ||
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
  "";

/** Microsoft Clarity project ID — set NEXT_PUBLIC_CLARITY_ID in .env.local */
export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "";

export const ANALYTICS_ENABLED =
  typeof window !== "undefined"
    ? Boolean(GA_MEASUREMENT_ID || CLARITY_PROJECT_ID)
    : Boolean(GA_MEASUREMENT_ID || CLARITY_PROJECT_ID);
