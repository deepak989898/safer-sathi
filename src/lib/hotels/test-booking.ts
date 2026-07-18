/**
 * Developer-only hotel payment bypass (Simulate payment button).
 *
 * Enable with NEXT_PUBLIC_TEST_BOOKING=true and redeploy.
 * Any other value (false, empty, unset) keeps simulate hidden.
 */
export function isHotelTestBookingEnabled(): boolean {
  const flag = (process.env.NEXT_PUBLIC_TEST_BOOKING ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export function buildTestRazorpayIds(bookingId: string) {
  const stamp = Date.now();
  const short = bookingId.replace(/[^a-z0-9]/gi, "").slice(-8);
  return {
    razorpayOrderId: `order_hotel_test_${short}_${stamp}`,
    razorpayPaymentId: `pay_hotel_test_${short}_${stamp}`,
    razorpaySignature: `test_signature_hotel_${stamp}`,
  };
}
