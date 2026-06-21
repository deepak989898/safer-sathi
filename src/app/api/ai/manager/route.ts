import { z } from "zod";
import {
  normalizePreferredLanguage,
  preprocessManagerRequestBody,
  sanitizeTravelManagerState,
} from "@/lib/ai/travel-manager/api-payload";
import {
  buildInitContext,
  persistAiMemory,
} from "@/lib/ai/travel-manager/init-context";
import { logAiAssistantEnquiry } from "@/lib/ai/travel-manager/enquiry-service";
import { runTravelManager } from "@/lib/ai/travel-manager/travel-manager-agent";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { TravelManagerState } from "@/types/travel-manager";

const stateSchema = z
  .object({
    step: z.string().optional(),
    intent: z.string().optional(),
    destination: z.string().optional(),
    tripType: z.string().optional(),
    selectedActivities: z.array(z.string()).optional(),
    guests: z.coerce.number().optional(),
    budget: z.coerce.number().optional(),
    durationDays: z.coerce.number().optional(),
    pickupCity: z.string().optional(),
    travelDate: z.string().optional(),
    specialRequest: z.string().optional(),
    hotelBudgetTier: z.string().optional(),
    selectedHotelId: z.string().optional(),
    selectedVehicleId: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    bookingId: z.string().optional(),
    userLocation: z
      .object({
        country: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        timezone: z.string().optional(),
        ip: z.string().optional(),
        region: z.union([z.enum(["north", "south", "other"]), z.string()]).optional(),
      })
      .optional(),
    memory: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const contextSchema = z.object({
  userId: z.string().optional(),
  guestId: z.string().optional(),
  browserLanguage: z.string().optional(),
  timezone: z.string().optional(),
  localPreferences: z
    .object({
      preferredLanguage: z
        .union([z.enum(["hindi", "english"]), z.string()])
        .optional()
        .transform((value) => normalizePreferredLanguage(value)),
      nativeLanguage: z.string().optional(),
      preferredBudget: z.coerce.number().optional(),
      favouriteDestinations: z.union([z.array(z.string()), z.string()]).optional().transform((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string" && value.trim()) return [value.trim()];
        return undefined;
      }),
      tripStyle: z.string().optional(),
      hotelCategory: z.string().optional(),
      vehiclePreference: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

const schema = z.object({
  message: z.string(),
  locale: z.enum(["en", "hi"]).optional(),
  forceLocale: z.enum(["en", "hi"]).optional(),
  state: stateSchema.optional(),
  context: contextSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(preprocessManagerRequestBody(body));
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const isInit = !parsed.data.message || parsed.data.message === "__init__";
    let initContext = null;

    if (isInit) {
      initContext = await buildInitContext(
        request,
        parsed.data.context,
        parsed.data.forceLocale
      );
    }

    const locale =
      parsed.data.forceLocale ??
      initContext?.locale ??
      parsed.data.locale ??
      "hi";

    const normalizedState = sanitizeTravelManagerState(
      parsed.data.state as Partial<TravelManagerState> | undefined
    );

    const result = await runTravelManager({
      message: parsed.data.message,
      locale,
      state: normalizedState,
      userLocation: initContext?.location ?? normalizedState?.userLocation,
      aiPreferences: initContext?.preferences,
    });

    if (parsed.data.context) {
      void persistAiMemory(parsed.data.context, result);
    }

    if (!isInit) {
      const selectedTier = result.packageTiers?.find(
        (t) => t.tierId === result.state.selectedTierId
      );

      void logAiAssistantEnquiry({
        request,
        userMessage: parsed.data.message,
        aiReply: result.reply,
        locale,
        state: result.state,
        context: parsed.data.context,
        packagePrice: result.packageQuote?.totalAmount ?? selectedTier?.totalAmount,
      });

      return apiSuccess({
        ...result,
        enquiryLogged: false,
        location: initContext?.location ?? result.state.userLocation,
        preferences: initContext?.preferences,
      });
    }

    return apiSuccess({
      ...result,
      enquiryLogged: false,
      location: initContext?.location ?? result.state.userLocation,
      preferences: initContext?.preferences,
    });
  } catch (err) {
    console.error("Travel manager error:", err);
    return apiError("Failed to process travel manager request", 500);
  }
}
