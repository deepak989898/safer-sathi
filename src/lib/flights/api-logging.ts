import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

const COLLECTION = "flightApiLogs";

function sanitize(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export async function logFlightApiCall(input: {
  bookingId?: string;
  endpoint: string;
  method: string;
  requestBody?: unknown;
  responseBody?: unknown;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
  userId?: string;
}): Promise<void> {
  const entry = {
    ...input,
    requestBody: input.requestBody ? sanitize(input.requestBody) : undefined,
    responseBody: input.responseBody ? sanitize(input.responseBody) : undefined,
    createdAt: new Date().toISOString(),
  };

  console.log("[flight-api]", {
    endpoint: input.endpoint,
    bookingId: input.bookingId,
    success: input.success,
    durationMs: input.durationMs,
    error: input.errorMessage,
  });

  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;

  try {
    await db.collection(COLLECTION).add(entry);
  } catch (error) {
    console.warn("[flight-api] failed to persist log:", error);
  }
}
