import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { fareValidateTripJackFlight, TripJackApiError } from "@/lib/tripjack/client";

const ssrItemSchema = z.object({
  key: z.string().min(1),
  code: z.string().min(1),
});

const travellerSchema = z.object({
  ti: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  pt: z.enum(["ADULT", "CHILD", "INFANT"]),
  fN: z.string().min(1),
  lN: z.string().min(1),
  ssrBaggageInfos: z.array(ssrItemSchema).optional(),
  ssrMealInfos: z.array(ssrItemSchema).optional(),
  ssrSeatInfos: z.array(ssrItemSchema).optional(),
  ssrFastForwardInfos: z.array(ssrItemSchema).optional(),
});

const schema = z.object({
  bookingId: z.string().min(1),
  travellerInfo: z.array(travellerSchema).min(1),
  deliveryInfo: z.object({
    emails: z.array(z.string().email()).min(1),
    contacts: z.array(z.string().min(10)).min(1),
    code: z.array(z.string().min(1)).min(1),
  }),
  previousTotalFare: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await fareValidateTripJackFlight({
      request: parsed.data,
      previousTotalFare: parsed.data.previousTotalFare,
    });

    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      validated: result.validated,
      proxyEndpoint: process.env.TRIPJACK_PROXY_BASE_URL
        ? `${process.env.TRIPJACK_PROXY_BASE_URL.replace(/\/$/, "")}/api/tripjack/flights/fare-validate`
        : "http://178.128.151.233:4000/api/tripjack/flights/fare-validate",
      ...(includeDebug ? { debug: { rawResponse: result.rawResponse } } : {}),
    });
  } catch (error) {
    if (error instanceof TripJackApiError) {
      return apiError(error.message, error.statusCode ?? 502, { raw: error.raw });
    }
    const message = error instanceof Error ? error.message : "Fare validate failed";
    return apiError(message, 500);
  }
}
