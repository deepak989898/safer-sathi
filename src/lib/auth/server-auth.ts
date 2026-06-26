import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  getAuthForTokenVerification,
  isTokenVerificationAvailable,
} from "@/lib/firebase/admin-verify";
import { loadUserProfileWithIdToken } from "@/lib/auth/firestore-profile-rest";
import type { User, UserRole, UserStatus } from "@/types";
import { canAccessAdmin } from "./constants";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  approved: boolean;
}

type AuthFailure = { error: NextResponse };
type AuthSuccess = { user: AuthenticatedUser };

export type AuthResult = AuthFailure | AuthSuccess;

interface VerifiedIdToken {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

const DEV_LOCAL_TOKEN = "dev-local";

function mapFirestoreUser(id: string, data: Record<string, unknown>): AuthenticatedUser {
  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    role: (data.role as UserRole) ?? "customer",
    status: (data.status as UserStatus) ?? "active",
    approved: Boolean(data.approved ?? true),
  };
}

async function loadUserProfile(uid: string): Promise<AuthenticatedUser | null> {
  const db = await getSafeAdminDb();
  if (!db) return null;

  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return mapFirestoreUser(doc.id, doc.data() as Record<string, unknown>);
}

async function loadUserProfileByEmail(email: string): Promise<AuthenticatedUser | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const db = await getSafeAdminDb();
  if (!db) return null;

  const candidates = [...new Set([trimmed, trimmed.toLowerCase()])];

  for (const candidate of candidates) {
    try {
      const snap = await db.collection("users").where("email", "==", candidate).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return mapFirestoreUser(doc.id, doc.data() as Record<string, unknown>);
      }
    } catch (error) {
      console.warn("loadUserProfileByEmail failed:", error);
    }
  }

  return null;
}

function profileFromDecodedToken(decoded: VerifiedIdToken): AuthenticatedUser {
  const role =
    (typeof decoded.role === "string" ? (decoded.role as UserRole) : undefined) ??
    "customer";

  return {
    id: decoded.uid,
    email: decoded.email ?? "",
    name: decoded.name ?? decoded.email?.split("@")[0] ?? "User",
    role,
    status: "active",
    approved: true,
  };
}

function mergeTokenRole(
  profile: AuthenticatedUser,
  decoded: VerifiedIdToken
): AuthenticatedUser {
  if (typeof decoded.role !== "string") return profile;

  const tokenRole = decoded.role as UserRole;
  if (profile.role === "customer" && tokenRole !== "customer") {
    return { ...profile, role: tokenRole };
  }
  if (canAccessAdmin(tokenRole) && !canAccessAdmin(profile.role)) {
    return { ...profile, role: tokenRole };
  }
  return profile;
}

function parseDevLocalAuth(request: Request): AuthenticatedUser | null {
  if (process.env.ALLOW_DEV_API_AUTH !== "true") return null;

  const userId = request.headers.get("X-User-Id");
  const role = request.headers.get("X-User-Role") as UserRole | null;
  const email = request.headers.get("X-User-Email") ?? "";

  if (!userId || !role || !canAccessAdmin(role)) return null;

  return {
    id: userId,
    email,
    name: email.split("@")[0] || "Dev User",
    role,
    status: "active",
    approved: true,
  };
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

function validateActiveUser(user: AuthenticatedUser): AuthFailure | null {
  if (user.status === "suspended") {
    return { error: apiError("Account suspended", 403) };
  }
  if (!user.approved && user.role !== "customer") {
    return { error: apiError("Account pending approval", 403) };
  }
  return null;
}

function adminCredentialsMessage(): string {
  return isAdminEnvConfigured()
    ? "Could not verify your session. Please sign out and sign in again."
    : "Server Firebase Admin is not fully configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel environment variables, then redeploy.";
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: apiError("Unauthorized", 401) };
  }

  if (token === DEV_LOCAL_TOKEN) {
    const devUser = parseDevLocalAuth(request);
    if (!devUser) {
      return { error: apiError("Invalid dev authentication", 401) };
    }
    const inactive = validateActiveUser(devUser);
    if (inactive) return inactive;
    return { user: devUser };
  }

  if (!isTokenVerificationAvailable()) {
    return {
      error: apiError(
        "Firebase project ID is not configured on the server.",
        503
      ),
    };
  }

  const adminAuth = await getAuthForTokenVerification();
  if (!adminAuth) {
    return { error: apiError(adminCredentialsMessage(), 503) };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    // REST + user token works without Firebase Admin credentials (rules: read own profile).
    let profile = await loadUserProfileWithIdToken(decoded.uid, token);

    if (!profile) {
      profile = await loadUserProfile(decoded.uid);
    }

    if (!profile && decoded.email) {
      profile = await loadUserProfileByEmail(decoded.email);
    }

    if (profile) {
      profile = mergeTokenRole(profile, decoded);
    } else {
      profile = profileFromDecodedToken(decoded);
    }

    // UI may show staff via client Firestore while server profile defaulted to customer.
    if (!canAccessAdmin(profile.role) && decoded.email) {
      const byEmail = await loadUserProfileByEmail(decoded.email);
      if (byEmail && canAccessAdmin(byEmail.role)) {
        profile = mergeTokenRole(byEmail, decoded);
      }
    }

    const inactive = validateActiveUser(profile);
    if (inactive) return inactive;
    return { user: profile };
  } catch (error) {
    console.error("Token verification failed:", error);
    return { error: apiError("Invalid or expired token. Please sign in again.", 401) };
  }
}

export async function optionalAuthenticateRequest(
  request: Request
): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const result = await authenticateRequest(request);
  if ("error" in result) return null;
  return result.user;
}

export function isStaffUser(user: AuthenticatedUser): boolean {
  return canAccessAdmin(user.role);
}

export function userToPublicUser(user: AuthenticatedUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    approved: user.approved,
    locale: "en",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
