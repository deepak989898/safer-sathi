/**
 * Developer-only flight booking payment bypass.
 * Enabled only when NEXT_PUBLIC_TEST_BOOKING=true and never in production.
 */

export function isFlightTestBookingEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_TEST_BOOKING === "true";
}

export function buildTestRazorpayIds(bookingId: string) {
  const stamp = Date.now();
  const short = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "flight";
  return {
    razorpayOrderId: `order_test_${short}_${stamp}`,
    razorpayPaymentId: `pay_test_${short}_${stamp}`,
    razorpaySignature: `test_signature_${stamp}`,
  };
}
