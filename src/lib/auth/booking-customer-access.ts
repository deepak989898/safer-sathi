import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin-safe";
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

function getAuthErrorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

async function findAuthUserIdByEmail(
  auth: NonNullable<Awaited<ReturnType<typeof getSafeAdminAuth>>>,
  email: string
): Promise<{ userId: string; created: boolean } | BookingLoginProvisionFailure> {
  try {
    const existing = await auth.getUserByEmail(email);
    return { userId: existing.uid, created: false };
  } catch (error) {
    const code = getAuthErrorCode(error);
    if (code !== "auth/user-not-found") {
      console.error("provisionCustomerBookingLogin getUserByEmail:", error);
      return {
        ok: false,
        reason:
          code === "auth/insufficient-permission"
            ? "Server cannot access Firebase Auth. Ask admin to grant the service account Firebase Authentication Admin role."
            : "Could not look up your account. Please try again in a minute.",
        code: code ?? "get_user_failed",
      };
    }
  }

  try {
    const createdUser = await auth.createUser({
      email,
      emailVerified: false,
      disabled: false,
    });
    return { userId: createdUser.uid, created: true };
  } catch (error) {
    const code = getAuthErrorCode(error);
    if (code === "auth/email-already-exists") {
      try {
        const existing = await auth.getUserByEmail(email);
        return { userId: existing.uid, created: false };
      } catch (retryError) {
        console.error("provisionCustomerBookingLogin retry getUserByEmail:", retryError);
      }
    }

    console.error("provisionCustomerBookingLogin createUser:", error);
    return {
      ok: false,
      reason: "Could not create your sign-in account. Please contact support@thesafarsathi.com.",
      code: code ?? "create_user_failed",
    };
  }
}

async function trySetBookingPassword(
  auth: NonNullable<Awaited<ReturnType<typeof getSafeAdminAuth>>>,
  userId: string,
  email: string,
  loginPassword: string,
  displayName: string
): Promise<boolean> {
  try {
    await auth.updateUser(userId, {
      email,
      password: loginPassword,
      displayName,
    });
    return true;
  } catch (error) {
    console.warn("provisionCustomerBookingLogin updateUser:", error);
    try {
      await auth.updateUser(userId, { password: loginPassword });
      return true;
    } catch (retryError) {
      console.warn("provisionCustomerBookingLogin password-only update:", retryError);
      return false;
    }
  }
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

/** Create or update customer Firebase Auth for booking-ID login. */
export async function provisionCustomerBookingLogin(
  booking: Booking
): Promise<BookingLoginProvisionResult> {
  const auth = await getSafeAdminAuth();
  if (!auth) {
    console.error("provisionCustomerBookingLogin: Firebase Admin Auth unavailable");
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

  const authUser = await findAuthUserIdByEmail(auth, email);
  if ("ok" in authUser) {
    return authUser;
  }

  const { userId, created } = authUser;
  const passwordUpdated = await trySetBookingPassword(
    auth,
    userId,
    email,
    loginPassword,
    booking.customerName
  );

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
  const auth = await getSafeAdminAuth();
  if (!auth) return null;

  try {
    return await auth.createCustomToken(userId);
  } catch (error) {
    console.error("createBookingLoginCustomToken failed:", error);
    return null;
  }
}