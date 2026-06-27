import { z } from "zod";
import { authenticateRequest } from "@/lib/auth/server-auth";
import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Locale } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().min(10).max(15).optional(),
  locale: z.enum(["en", "hi"]).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    if (auth.user.role !== "customer") {
      return apiError("Only customers can access this profile.", 403);
    }

    const db = await getSafeAdminDb();
    if (!db) {
      return apiSuccess({
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        phone: auth.user.phone ?? "",
        locale: "en" as Locale,
        rewardPoints: auth.user.rewardPoints ?? 0,
      });
    }

    const snap = await db.collection("users").doc(auth.user.id).get();
    const data = snap.data() ?? {};

    return apiSuccess({
      id: auth.user.id,
      email: String(data.email ?? auth.user.email),
      name: String(data.name ?? auth.user.name),
      phone: String(data.phone ?? auth.user.phone ?? ""),
      locale: (data.locale as Locale) ?? "en",
      rewardPoints: Number(data.rewardPoints ?? 0),
      lifetimeRewardPoints: Number(data.lifetimeRewardPoints ?? 0),
      passwordIsBookingId: data.passwordIsBookingId === true,
      lastBookingNumber: data.lastBookingNumber
        ? String(data.lastBookingNumber)
        : undefined,
    });
  } catch (error) {
    console.error("Customer profile GET error:", error);
    return apiError("Failed to load profile", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    if (auth.user.role !== "customer") {
      return apiError("Only customers can update this profile.", 403);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (
      !parsed.data.name &&
      !parsed.data.phone &&
      parsed.data.locale === undefined
    ) {
      return apiError("No profile fields to update.", 400);
    }

    const db = await getSafeAdminDb();
    if (!db) {
      return apiError("Profile service unavailable.", 503);
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };
    if (parsed.data.name) updates.name = parsed.data.name.trim();
    if (parsed.data.phone) {
      updates.phone = parsed.data.phone.replace(/\D/g, "").slice(-10);
    }
    if (parsed.data.locale) updates.locale = parsed.data.locale;

    await db.collection("users").doc(auth.user.id).set(updates, { merge: true });

    const snap = await db.collection("users").doc(auth.user.id).get();
    const data = snap.data() ?? {};

    return apiSuccess({
      id: auth.user.id,
      email: String(data.email ?? auth.user.email),
      name: String(data.name ?? auth.user.name),
      phone: String(data.phone ?? ""),
      locale: (data.locale as Locale) ?? "en",
      rewardPoints: Number(data.rewardPoints ?? 0),
      lifetimeRewardPoints: Number(data.lifetimeRewardPoints ?? 0),
    });
  } catch (error) {
    console.error("Customer profile PATCH error:", error);
    return apiError("Failed to update profile", 500);
  }
}
