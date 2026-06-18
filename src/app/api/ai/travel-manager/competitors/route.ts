import { z } from "zod";
import { analyzeCompetitorWebsite } from "@/lib/ai-travel-manager/agents/competitor-analyzer";
import {
  actorRoleSchema,
  requireAnalyze,
  requireAITravelManagerAccess,
} from "@/lib/ai-travel-manager/api-auth";
import { canViewCompetitorData } from "@/lib/ai-travel-manager/permissions";
import {
  hydrateAITravelManagerStore,
  listCompetitorData,
} from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParsed = actorRoleSchema.safeParse(searchParams.get("actorRole"));
    if (!roleParsed.success) return apiError("actorRole required", 400);
    const denied = requireAITravelManagerAccess(roleParsed.data);
    if (denied) return denied;
    if (!canViewCompetitorData(roleParsed.data)) {
      return apiError("You cannot view competitor data", 403);
    }

    await hydrateAITravelManagerStore();
    return apiSuccess(listCompetitorData());
  } catch (err) {
    console.error("List competitors error:", err);
    return apiError("Failed to list competitor data", 500);
  }
}

const analyzeSchema = z.object({
  actorRole: actorRoleSchema,
  websiteUrl: z.string().url("Valid website URL required"),
  websiteName: z.string().min(2),
  destinationHint: z.string().optional(),
  analyzedBy: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const denied = requireAnalyze(parsed.data.actorRole);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    const result = await analyzeCompetitorWebsite({
      websiteUrl: parsed.data.websiteUrl,
      websiteName: parsed.data.websiteName,
      destinationHint: parsed.data.destinationHint,
      analyzedBy: parsed.data.analyzedBy,
    });

    return apiSuccess(result, 201);
  } catch (err) {
    console.error("Analyze competitor error:", err);
    return apiError("Failed to analyze competitor website", 500);
  }
}
