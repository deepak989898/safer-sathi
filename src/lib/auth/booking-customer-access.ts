import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import {
  createAuthUser,
  createFirebaseCustomToken,
  isFirebaseAuthRestAvailable,
  lookupAuthUserByEmail,
  updateAuthUser,
} from "@/lib/firebase/auth-rest-admin";
import { upsertBooking } from "@/lib/data-service";
import type { Booking } from "@/types";

export interface BookingLoginProvision {
  userId: string;
  email: string;
  loginPassword: string;
  created: boolean;
  passwordUpdated?: boolean;
}

export interface BookingLoginProvisionFailure {
  ok: false;
  reason: string;
  code?: string;
}

export type BookingLoginProvisionResult =
  | ({ ok: true } & BookingLoginProvision)
  | BookingLoginProvisionFailure;

function normalizeLoginPassword(bookingNumber: string): string {
  return bookingNumber.trim().toUpperCase();
}

async function findOrCreateAuthUserId(
  email: string,
  loginPassword: string,
  displayName: string
): Promise<
  | { userId: string; created: boolean; passwordUpdated: boolean }
  | BookingLoginProvisionFailure
> {
  const existing = await lookupAuthUserByEmail(email);
  if (existing) {
    const updated = await updateAuthUser({
      localId: existing.localId,
      email,
      password: loginPassword,
      displayName,
    });
    return {
      userId: existing.localId,
      created: false,
      passwordUpdated: updated.ok,
    };
  }

  const created = await createAuthUser({
    email,
    password: loginPassword,
    displayName,
  });

  if ("error" in created) {
    if (
      created.error.includes("EMAIL_EXISTS") ||
      created.error.includes("email address is already")
    ) {
      const retryLookup = await lookupAuthUserByEmail(email);
      if (retryLookup) {
        const updated = await updateAuthUser({
          localId: retryLookup.localId,
          email,
          password: loginPassword,
          displayName,
        });
        return {
          userId: retryLookup.localId,
          created: false,
          passwordUpdated: updated.ok,
        };
      }
    }

    console.error("provisionCustomerBookingLogin createAuthUser:", created.error);
    return {
      ok: false,
      reason: "Could not create your sign-in account. Please contact support@thesafarsathi.com.",
      code: "create_user_failed",
    };
  }

  return {
    userId: created.localId,
    created: true,
    passwordUpdated: true,
  };
}

async function tryWriteCustomerProfile(
  userId: string,
  booking: Booking,
  loginPassword: string,
  created: boolean
): Promise<void> {
  const db = await getSafeAdminDb();
  if (!db) return;

  const email = booking.customerEmail.toLowerCase().trim();
  const now = new Date().toISOString();

  try {
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
  } catch (error) {
    console.warn("provisionCustomerBookingLogin users profile write:", error);
  }
}

/** Create or update customer Firebase Auth for booking-ID login. Vercel-safe REST path. */
export async function provisionCustomerBookingLogin(
  booking: Booking
): Promise<BookingLoginProvisionResult> {
  if (!isFirebaseAuthRestAvailable()) {
    console.error("provisionCustomerBookingLogin: Firebase Auth REST unavailable");
    return {
      ok: false,
      reason:
        "Sign-in service is temporarily unavailable. Please try again in a minute or contact support@thesafarsathi.com.",
      code: "auth_unavailable",
    };
  }

  const email = booking.customerEmail.toLowerCase().trim();
  const loginPassword = normalizeLoginPassword(booking.bookingNumber);
  const now = new Date().toISOString();

  const authUser = await findOrCreateAuthUserId(
    email,
    loginPassword,
    booking.customerName
  );
  if ("ok" in authUser) {
    return authUser;
  }

  const { userId, created, passwordUpdated } = authUser;

  await tryWriteCustomerProfile(userId, booking, loginPassword, created);

  if (booking.userId !== userId) {
    try {
      await upsertBooking({
        ...booking,
        userId,
        bookingNumber: loginPassword,
        updatedAt: now,
      });
    } catch (error) {
      console.warn("provisionCustomerBookingLogin booking link:", error);
    }
  }

  return {
    ok: true,
    userId,
    email,
    loginPassword,
    created,
    passwordUpdated,
  };
}

export async function createBookingLoginCustomToken(userId: string): Promise<string | null> {
  return createFirebaseCustomToken(userId);
}
