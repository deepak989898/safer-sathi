import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import {
  createAuthUser,
  createFirebaseCustomToken,
  isFirebaseAuthRestAvailable,
  lookupAuthUserByEmail,
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

export interface GuestCustomerProfileInput {
  email: string;
  name: string;
  phone: string;
  loginPassword: string;
  totalSpent?: number;
}

function normalizePackageLoginPassword(bookingNumber: string): string {
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
    return {
      userId: existing.localId,
      created: false,
      // Keep the user's existing password unchanged. Booking-ID login is handled
      // through custom-token flow, so both normal password and booking-ID methods work.
      passwordUpdated: false,
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
        return {
          userId: retryLookup.localId,
          created: false,
          passwordUpdated: false,
        };
      }
    }

    console.error("provisionGuestCustomerLogin createAuthUser:", created.error);
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

async function tryWriteGuestCustomerProfile(
  userId: string,
  input: GuestCustomerProfileInput,
  created: boolean
): Promise<void> {
  const db = await getSafeAdminDb();
  if (!db) return;

  const email = input.email.toLowerCase().trim();
  const now = new Date().toISOString();

  try {
    await db.collection("users").doc(userId).set(
      {
        email,
        name: input.name,
        phone: input.phone,
        role: "customer",
        status: "active",
        approved: true,
        locale: "en",
        segment: "new",
        lastBookingNumber: input.loginPassword,
        passwordIsBookingId: true,
        updatedAt: now,
        ...(created
          ? {
              totalBookings: 1,
              totalSpent: input.totalSpent ?? 0,
              createdAt: now,
            }
          : {}),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("provisionGuestCustomerLogin users profile write:", error);
  }
}

/** Shared guest account provisioning (packages, flights, etc.). */
export async function provisionGuestCustomerLogin(
  input: GuestCustomerProfileInput
): Promise<BookingLoginProvisionResult> {
  if (!isFirebaseAuthRestAvailable()) {
    console.error("provisionGuestCustomerLogin: Firebase Auth REST unavailable");
    return {
      ok: false,
      reason:
        "Sign-in service is temporarily unavailable. Please try again in a minute or contact support@thesafarsathi.com.",
      code: "auth_unavailable",
    };
  }

  const email = input.email.toLowerCase().trim();
  const loginPassword = input.loginPassword.trim();

  const authUser = await findOrCreateAuthUserId(email, loginPassword, input.name);
  if ("ok" in authUser) {
    return authUser;
  }

  const { userId, created, passwordUpdated } = authUser;
  await tryWriteGuestCustomerProfile(userId, { ...input, email, loginPassword }, created);

  return {
    ok: true,
    userId,
    email,
    loginPassword,
    created,
    passwordUpdated,
  };
}

/** Create or update customer Firebase Auth for package booking-ID login. */
export async function provisionCustomerBookingLogin(
  booking: Booking
): Promise<BookingLoginProvisionResult> {
  const email = booking.customerEmail.toLowerCase().trim();
  const loginPassword = normalizePackageLoginPassword(booking.bookingNumber);
  const now = new Date().toISOString();

  const provision = await provisionGuestCustomerLogin({
    email,
    name: booking.customerName,
    phone: booking.customerPhone,
    loginPassword,
    totalSpent: booking.paidAmount ?? 0,
  });

  if (!provision.ok) {
    return provision;
  }

  if (booking.userId !== provision.userId) {
    try {
      await upsertBooking({
        ...booking,
        userId: provision.userId,
        bookingNumber: loginPassword,
        updatedAt: now,
      });
    } catch (error) {
      console.warn("provisionCustomerBookingLogin booking link:", error);
    }
  }

  return provision;
}

export async function createBookingLoginCustomToken(userId: string): Promise<string | null> {
  return createFirebaseCustomToken(userId);
}
