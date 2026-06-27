import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { upsertBooking } from "@/lib/data-service";
import type { Booking } from "@/types";

export interface BookingLoginProvision {
  userId: string;
  email: string;
  loginPassword: string;
  created: boolean;
}

function normalizeLoginPassword(bookingNumber: string): string {
  return bookingNumber.trim().toUpperCase();
}

/** Create or update customer Firebase Auth so they can sign in with email + booking number. */
export async function provisionCustomerBookingLogin(
  booking: Booking
): Promise<BookingLoginProvision | null> {
  const auth = await getSafeAdminAuth();
  const db = await getSafeAdminDb();
  if (!auth || !db) {
    console.error("provisionCustomerBookingLogin: Firebase Admin Auth/DB unavailable");
    return null;
  }

  const email = booking.customerEmail.toLowerCase().trim();
  const loginPassword = normalizeLoginPassword(booking.bookingNumber);
  const now = new Date().toISOString();
  let userId: string;
  let created = false;

  try {
    const existing = await auth.getUserByEmail(email);
    userId = existing.uid;
    try {
      await auth.updateUser(userId, {
        password: loginPassword,
        displayName: booking.customerName,
      });
    } catch (updateError) {
      console.warn("provisionCustomerBookingLogin updateUser retry:", updateError);
      await auth.updateUser(userId, { password: loginPassword });
    }
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      console.error("provisionCustomerBookingLogin getUserByEmail:", error);
      return null;
    }
    const createdUser = await auth.createUser({
      email,
      password: loginPassword,
      displayName: booking.customerName,
      emailVerified: false,
      disabled: false,
    });
    userId = createdUser.uid;
    created = true;
  }

  await db.collection("users").doc(userId).set(
    {
      email,
      name: booking.customerName,
      phone: booking.customerPhone,
      role: "customer",
      status: "active",
      approved: true,
      locale: "en",
      segment: "new",
      lastBookingNumber: loginPassword,
      passwordIsBookingId: true,
      updatedAt: now,
      ...(created
        ? {
            totalBookings: 1,
            totalSpent: booking.paidAmount ?? 0,
            createdAt: now,
          }
        : {}),
    },
    { merge: true }
  );

  if (booking.userId !== userId) {
    await upsertBooking({
      ...booking,
      userId,
      bookingNumber: loginPassword,
      updatedAt: now,
    });
  }

  return { userId, email, loginPassword, created };
}
