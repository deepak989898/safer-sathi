export function isHotelTestBookingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TEST_BOOKING === "true";
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
