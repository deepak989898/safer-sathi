import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
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

  if (!isAdminEnvConfigured()) {
    return { error: apiError("Authentication service unavailable", 503) };
  }

  const adminAuth = await getSafeAdminAuth();
  if (!adminAuth) {
    return { error: apiError("Authentication service unavailable", 503) };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const profile = await loadUserProfile(decoded.uid);
    if (!profile) {
      return { error: apiError("User profile not found", 401) };
    }
    const inactive = validateActiveUser(profile);
    if (inactive) return inactive;
    return { user: profile };
  } catch {
    return { error: apiError("Invalid or expired token", 401) };
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
