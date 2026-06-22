import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { COLLECTIONS, getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { appUrl } from "@/lib/site-config";
import type { User, UserRole } from "@/types";
import { isStaffRole } from "./constants";
import { canManageUser } from "./permissions";
import {
  localApproveUser,
  localClearSession,
  localGetAllUsers,
  localGetSession,
  localLogin,
  localRegister,
  localSetSession,
  localSuspendUser,
} from "./local-auth-store";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

let staffRegistrationInProgress = false;

export function isStaffRegistrationInProgress(): boolean {
  return staffRegistrationInProgress;
}

function validateLoginProfile(profile: User): void {
  if (profile.status === "suspended") {
    throw new AuthError("Your account has been suspended. Contact support.");
  }
  if (profile.status === "pending" || (!profile.approved && isStaffRole(profile.role))) {
    throw new AuthError(
      "Your account is pending admin approval. You will be able to sign in after approval."
    );
  }
}

function mapFirestoreUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    phone: data.phone ? String(data.phone) : undefined,
    role: (data.role as UserRole) ?? "customer",
    status: (data.status as User["status"]) ?? "active",
    approved: Boolean(data.approved ?? true),
    avatar: data.avatar ? String(data.avatar) : undefined,
    locale: (data.locale as User["locale"]) ?? "en",
    segment: data.segment as User["segment"],
    totalBookings: Number(data.totalBookings ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

async function createFirestoreProfile(
  uid: string,
  profile: Omit<User, "id">
): Promise<User> {
  const db = getFirebaseDb();
  await setDoc(doc(db, COLLECTIONS.users, uid), profile);
  return { id: uid, ...profile };
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured()) {
    return localGetSession()?.id === uid ? localGetSession() : localGetUserByIdLocal(uid);
  }

  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  return mapFirestoreUser(snap.id, snap.data() as Record<string, unknown>);
}

function localGetUserByIdLocal(id: string) {
  return localGetAllUsers().find((u) => u.id === id) ?? null;
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<User> {
  if (!isFirebaseConfigured()) {
    const user = localRegister({
      ...input,
      role: "customer",
      autoApprove: true,
    });
    localSetSession(user.id);
    return user;
  }

  const auth = getFirebaseAuth();
  const email = input.email.toLowerCase().trim();
  const now = new Date().toISOString();

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    input.password
  );

  return createFirestoreProfile(credential.user.uid, {
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
    role: "customer",
    status: "active",
    approved: true,
    locale: "en",
    segment: "new",
    totalBookings: 0,
    totalSpent: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function registerStaff(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}): Promise<{ user: User; requiresApproval: boolean }> {
  if (input.role === "customer" || input.role === "super_admin") {
    throw new AuthError("Invalid staff role selected.");
  }

  if (!isFirebaseConfigured()) {
    const user = localRegister({
      ...input,
      role: input.role,
      autoApprove: false,
    });
    localClearSession();
    return { user, requiresApproval: true };
  }

  staffRegistrationInProgress = true;
  const auth = getFirebaseAuth();
  const email = input.email.toLowerCase().trim();
  const now = new Date().toISOString();

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      input.password
    );

    const user = await createFirestoreProfile(credential.user.uid, {
      email,
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: input.role,
      status: "pending",
      approved: false,
      locale: "en",
      createdAt: now,
      updatedAt: now,
    });

    await signOut(auth);
    return { user, requiresApproval: true };
  } catch (error) {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Ignore sign-out errors during cleanup.
    }
    throw error;
  } finally {
    staffRegistrationInProgress = false;
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  if (!isFirebaseConfigured()) {
    const user = localLogin(email, password);
    validateLoginProfile(user);
    localSetSession(user.id);
    return user;
  }

  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    email.toLowerCase().trim(),
    password
  );

  const profile = await getUserProfile(credential.user.uid);
  if (!profile) {
    await signOut(auth);
    throw new AuthError("Account profile not found. Please contact support.");
  }

  validateLoginProfile(profile);
  return profile;
}

export async function logoutUser(): Promise<void> {
  if (!isFirebaseConfigured()) {
    localClearSession();
    return;
  }
  await signOut(getFirebaseAuth());
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new AuthError("Please enter your email address.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AuthError("Please enter a valid email address.");
  }

  if (!isFirebaseConfigured()) {
    throw new AuthError(
      "Password reset is not available in demo mode. Please contact support."
    );
  }

  const continueUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login?reset=done`
      : appUrl("/login?reset=done");

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const text = await res.text();
      let json: {
        success?: boolean;
        error?: string;
        data?: { sent?: boolean; delivery?: string };
      } = {};

      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        json = {};
      }

      if (res.ok && json.data?.delivery === "firebase_client_fallback") {
        await sendPasswordResetEmail(getFirebaseAuth(), normalized, {
          url: continueUrl,
          handleCodeInApp: false,
        });
        return;
      }

      if (res.ok && json.data?.sent) {
        return;
      }

      if (res.status === 400 && json.error) {
        throw new AuthError(json.error);
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.warn("Server password reset unavailable, using Firebase client:", error);
    }

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), normalized, {
        url: continueUrl,
        handleCodeInApp: false,
      });
      return;
    } catch (error) {
      throw new Error(getFirebaseAuthErrorMessage(error));
    }
  }

  await sendPasswordResetEmail(getFirebaseAuth(), normalized, {
    url: continueUrl,
    handleCodeInApp: false,
  });
}

export async function resolveAuthUser(
  firebaseUser: FirebaseUser | null
): Promise<User | null> {
  if (!firebaseUser) {
    if (!isFirebaseConfigured()) return localGetSession();
    return null;
  }
  return getUserProfile(firebaseUser.uid);
}

export async function listAllUsers(): Promise<User[]> {
  if (!isFirebaseConfigured()) {
    return localGetAllUsers();
  }

  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.users));
  return snap.docs.map((d) => mapFirestoreUser(d.id, d.data() as Record<string, unknown>));
}

export async function approveUserAccount(
  userId: string,
  actorRole: UserRole
): Promise<User> {
  const target = isFirebaseConfigured()
    ? await getUserProfile(userId)
    : localGetUserByIdLocal(userId);

  if (!target) throw new AuthError("User not found.");
  if (!canManageUser(actorRole, target.role)) {
    throw new AuthError("You do not have permission to approve this user.");
  }

  if (!isFirebaseConfigured()) {
    return localApproveUser(userId);
  }

  const ref = doc(getFirebaseDb(), COLLECTIONS.users, userId);
  await updateDoc(ref, {
    status: "active",
    approved: true,
    updatedAt: new Date().toISOString(),
  });
  const updated = await getUserProfile(userId);
  if (!updated) throw new AuthError("User not found after approval.");
  return updated;
}

export async function suspendUserAccount(
  userId: string,
  actorRole: UserRole
): Promise<User> {
  const target = isFirebaseConfigured()
    ? await getUserProfile(userId)
    : localGetUserByIdLocal(userId);

  if (!target) throw new AuthError("User not found.");
  if (!canManageUser(actorRole, target.role)) {
    throw new AuthError("You do not have permission to suspend this user.");
  }

  if (!isFirebaseConfigured()) {
    return localSuspendUser(userId);
  }

  const ref = doc(getFirebaseDb(), COLLECTIONS.users, userId);
  await updateDoc(ref, {
    status: "suspended",
    approved: false,
    updatedAt: new Date().toISOString(),
  });
  const updated = await getUserProfile(userId);
  if (!updated) throw new AuthError("User not found.");
  return updated;
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Register first if you are new.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/invalid-continue-uri":
      return "Password reset is temporarily unavailable. Please contact support@thesafarsathi.com.";
    case "auth/unauthorized-continue-uri":
      return "Password reset is temporarily unavailable. Please contact support@thesafarsathi.com.";
    default:
      if (error instanceof AuthError) return error.message;
      return "Authentication failed. Please try again.";
  }
}
