/** Client-safe helpers — no server/Firebase imports. */

export function generateHotelCorrelationId(): string {
  return `htl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
