import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  getAiCenterSettings,
  hydrateAiCenterStore,
  previewCityKeywordResearch,
  saveCityKeywords,
} from "@/lib/ai-center/repository";
import type { SeoKeyword } from "@/lib/ai-center/types";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const citySchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  city: z.string().min(2).max(80),
  mode: z.enum(["preview", "save"]),
  keywords: z
    .array(
      z.object({
        id: z.string(),
        keyword: z.string(),
        searchVolume: z.number(),
        competition: z.enum(["low", "medium", "high"]),
        trendScore: z.number(),
        category: z.enum([
          "tour_packages",
          "hotels",
          "vehicles",
          "destinations",
          "travel_guides",
          "local",
        ]),
        destination: z.string().optional(),
        seoScore: z.number(),
        source: z
          .enum(["google_suggest", "google_serp", "template", "ai", "city_research"])
          .optional(),
        createdAt: z.string().optional(),
      })
    )
    .optional(),
  autoApprove: z.boolean().optional(),
  limit: z.number().min(10).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = citySchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiCenterStore();

    if (parsed.data.mode === "preview") {
      const result = await previewCityKeywordResearch(
        parsed.data.city,
        parsed.data.limit ?? 100
      );
      return apiSuccess({
        city: result.city,
        keywords: result.keywords,
        count: result.keywords.length,
        templateCount: result.templateCount,
        googleSuggestCount: result.googleSuggestCount,
        googleSerpCount: result.googleSerpCount,
      });
    }

    const records = (parsed.data.keywords ?? []) as SeoKeyword[];
    if (records.length === 0) {
      return apiError("Select at least one keyword to save.", 400);
    }

    const settings = getAiCenterSettings();
    const autoApprove =
      parsed.data.autoApprove ?? settings.autoKeywordApproveEnabled ?? false;

    const result = await saveCityKeywords(
      parsed.data.city,
      records,
      parsed.data.actorId,
      autoApprove
    );

    return apiSuccess({
      city: parsed.data.city,
      added: result.added,
      approved: result.approved,
      count: result.added.length,
      approvedCount: result.approved.length,
      duplicatesSkipped: result.duplicatesSkipped,
      autoApprove,
    });
  } catch (err) {
    console.error("City keyword research error:", err);
    return apiError(err instanceof Error ? err.message : "City keyword research failed", 500);
  }
}
