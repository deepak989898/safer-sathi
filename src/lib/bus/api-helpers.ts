import { z } from "zod";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError } from "@/lib/api-response";

export const busIdTypeSchema = z.enum([
  "PAN_CARD",
  "VOTER_CARD",
  "PASSPORT",
  "DRIVING_LICENCE",
  "RATION_CARD",
  "AADHAR",
]);

export const busGenderSchema = z.enum(["MALE", "FEMALE"]);

export const busPassengerSchema = z.object({
  title: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().min(2),
  age: z.coerce.number().int().min(1).max(120),
  gender: busGenderSchema,
  mobile: z.string().min(10),
  email: z.string().email(),
  idType: busIdTypeSchema,
  idNumber: z.string().min(1),
  address: z.string().min(3),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  emergencyContact: z.string().optional(),
  gst: z.string().optional(),
  seatName: z.string().min(1),
  ladiesSeat: z.boolean(),
  fare: z.number().positive(),
});

export async function getBusUserId(request: Request): Promise<string> {
  const auth = await optionalAuthenticateRequest(request);
  return auth?.id ?? "guest";
}

export async function requireBusUser(request: Request) {
  const auth = await optionalAuthenticateRequest(request);
  if (!auth?.id || auth.id === "guest") {
    return { error: apiError("Please sign in to continue", 401) };
  }
  return { user: auth };
}

export function busApiError(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error("[bus-api]", message);
  return apiError(message, 500);
}
