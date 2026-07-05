import type { HotelBookingRecord } from "@/lib/hotels/types";
import type { CancellationPenalty } from "@/lib/tripjack-hotels/types";

export interface HotelCancellationEstimate {
  cancellationCharge: number;
  expectedRefund: number;
  penaltyLabel: string;
  isFreeCancellation: boolean;
}

function penaltyAppliesNow(penalty: CancellationPenalty, now: Date): boolean {
  const from = penalty.from ? new Date(`${penalty.from}T23:59:59`) : null;
  const to = penalty.to ? new Date(`${penalty.to}T00:00:00`) : null;
  if (from && now > from && to && now < to) return true;
  if (from && !to && now >= from) return true;
  if (!from && to && now <= to) return true;
  if (!from && !to) return true;
  return false;
}

export function estimateHotelCancellationCharge(
  booking: HotelBookingRecord
): HotelCancellationEstimate {
  const paid = booking.paymentStatus === "paid" ? booking.totalFare : 0;
  const now = new Date();
  const option = booking.reviewNormalized?.option;
  const penalties = option?.penalties ?? [];

  const freeUntil = option?.freeCancellationUntil;
  if (freeUntil) {
    const freeDate = new Date(`${freeUntil}T23:59:59`);
    if (now <= freeDate) {
      return {
        cancellationCharge: 0,
        expectedRefund: paid,
        penaltyLabel: `Free cancellation until ${freeUntil}`,
        isFreeCancellation: true,
      };
    }
  }

  if (option?.isRefundable === false) {
    return {
      cancellationCharge: paid,
      expectedRefund: 0,
      penaltyLabel: "Non-refundable booking",
      isFreeCancellation: false,
    };
  }

  let charge = paid;
  let label = "Full cancellation charge may apply";

  for (const penalty of penalties) {
    if (penaltyAppliesNow(penalty, now)) {
      charge = penalty.amount;
      label = penalty.label || `Cancellation charge: ${penalty.amount}`;
      break;
    }
  }

  if (penalties.length === 0 && option?.isRefundable) {
    charge = 0;
    label = "Refundable — no penalty at this time";
  }

  return {
    cancellationCharge: Math.min(charge, paid),
    expectedRefund: Math.max(0, paid - Math.min(charge, paid)),
    penaltyLabel: label,
    isFreeCancellation: charge === 0,
  };
}
