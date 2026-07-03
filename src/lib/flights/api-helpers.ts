import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError } from "@/lib/api-response";

export async function getFlightUserId(request: Request): Promise<string> {
  const auth = await optionalAuthenticateRequest(request);
  return auth?.id ?? "guest";
}

export function flightApiError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error("[flight-api]", message);
  return apiError(message, 500);
}
