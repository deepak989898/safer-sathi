import { z } from "zod";
import { trackVisitorEvent } from "@/lib/visitor-analytics/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

const eventSchema = z.object({
  type: z.enum(["page_view", "click", "search", "exit", "heartbeat"]),
  at: z.string().min(1),
  path: z.string().min(1).max(500),
  title: z.string().max(300).optional(),
  label: z.string().max(300).optional(),
  target: z.string().max(500).optional(),
  searchQuery: z.string().max(300).optional(),
});

const bodySchema = z.object({
  sessionId: z.string().min(8).max(80),
  visitorId: z.string().min(8).max(80),
  userId: z.string().max(128).optional(),
  event: eventSchema,
  sessionMeta: z
    .object({
      referrer: z.string().max(500).optional(),
      utmSource: z.string().max(120).optional(),
      utmMedium: z.string().max(120).optional(),
      utmCampaign: z.string().max(120).optional(),
      utmTerm: z.string().max(120).optional(),
      userAgent: z.string().max(500).optional(),
      language: z.string().max(20).optional(),
      screenWidth: z.number().optional(),
      deviceId: z.string().max(80).optional(),
      deviceName: z.string().max(200).optional(),
    })
    .optional(),
});

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
    }

    if (parsed.data.event.path.startsWith("/admin")) {
      return apiSuccess({ ok: true, skipped: true });
    }

    await trackVisitorEvent({
      ...parsed.data,
      ip: clientIp(request),
      country: request.headers.get("x-vercel-ip-country") ?? undefined,
      city: request.headers.get("x-vercel-ip-city") ?? undefined,
    });

    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("Visitor analytics track error:", err);
    return apiError("Failed to track event", 500);
  }
}
