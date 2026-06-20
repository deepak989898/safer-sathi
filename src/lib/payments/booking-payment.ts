export type PaymentPlan = "full" | "advance";

export const ADVANCE_PAYMENT_PERCENT = 10;

export function calculateAdvanceAmount(totalAmount: number): number {
  return Math.max(1, Math.round(totalAmount * (ADVANCE_PAYMENT_PERCENT / 100)));
}

export function calculatePayNowAmount(
  totalAmount: number,
  paymentPlan: PaymentPlan,
  paidAmount = 0
): number {
  const remaining = Math.max(0, totalAmount - paidAmount);
  if (remaining <= 0) return 0;
  if (paidAmount > 0) return remaining;
  if (paymentPlan === "full") return remaining;
  return Math.min(remaining, calculateAdvanceAmount(totalAmount));
}

export function getBalanceDue(totalAmount: number, paidAmount = 0): number {
  return Math.max(0, totalAmount - paidAmount);
}

export function describePaymentPlan(
  totalAmount: number,
  paymentPlan: PaymentPlan,
  locale: "en" | "hi" = "en"
): { payNow: number; balance: number; label: string } {
  const payNow = calculatePayNowAmount(totalAmount, paymentPlan);
  const balance = getBalanceDue(totalAmount, payNow);

  if (paymentPlan === "full") {
    return {
      payNow,
      balance: 0,
      label:
        locale === "hi"
          ? `पूरा भुगतान · ${payNow.toLocaleString("en-IN")}`
          : `Pay full amount · ₹${payNow.toLocaleString("en-IN")}`,
    };
  }

  return {
    payNow,
    balance,
    label:
      locale === "hi"
        ? `${ADVANCE_PAYMENT_PERCENT}% अग्रिम · ₹${payNow.toLocaleString("en-IN")} (बाकी ₹${balance.toLocaleString("en-IN")})`
        : `${ADVANCE_PAYMENT_PERCENT}% advance · ₹${payNow.toLocaleString("en-IN")} (balance ₹${balance.toLocaleString("en-IN")})`,
  };
}
