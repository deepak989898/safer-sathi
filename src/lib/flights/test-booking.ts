/**
 * Developer-only flight booking payment bypass.
 *
 * Enable with:
 *   NEXT_PUBLIC_TEST_BOOKING=true
 *
 * Set to false (or remove) before real customer payments go live.
 * Works on Vercel production builds when the env var is set (needed for UAT on live domain).
 */

export function isFlightTestBookingEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_TEST_BOOKING ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
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
