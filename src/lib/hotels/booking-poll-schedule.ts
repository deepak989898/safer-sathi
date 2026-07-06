/** Escalating poll delays after first refresh: 10s → 20s → 40s → 60s → 120s */
export const HOTEL_BOOKING_POLL_DELAYS_MS = [10_000, 20_000, 40_000, 60_000, 120_000] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
