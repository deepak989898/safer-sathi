/** Where to send the customer after a successful payment. */
export function postPaymentPath(isLoggedIn: boolean): string {
  return isLoggedIn ? "/my-bookings" : "/login?redirect=/my-bookings";
}

/** Toast copy after payment when the customer may need to sign in with booking ID. */
export function postPaymentSuccessMessage(
  bookingNumber: string,
  isLoggedIn: boolean
): string {
  if (isLoggedIn) {
    return `Payment successful! Booking ${bookingNumber} confirmed.`;
  }
  return `Booking ${bookingNumber} confirmed! Sign in with your email and Booking ID (${bookingNumber}) as your password.`;
}
