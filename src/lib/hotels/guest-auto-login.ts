"use client";

import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { normalizeBookingLoginPassword } from "@/lib/auth/booking-login-credentials";

export async function autoLoginHotelGuestAfterPayment(input: {
  loginEmail: string;
  loginPassword: string;
}): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;

  try {
    const res = await fetch("/api/auth/booking-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.loginEmail.toLowerCase().trim(),
        bookingNumber: normalizeBookingLoginPassword(input.loginPassword),
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      data?: { customToken?: string };
    };

    const customToken = json.data?.customToken;
    if (!res.ok || !customToken) return false;

    const auth = getFirebaseAuth();
    await signInWithCustomToken(auth, customToken);
    return true;
  } catch (error) {
    console.warn("[hotel-guest-login] auto sign-in failed:", error);
    return false;
  }
}
