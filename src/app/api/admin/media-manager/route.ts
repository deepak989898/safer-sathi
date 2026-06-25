import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  buildMediaManagerReport,
  bulkEnrichCatalogImages,
  bulkFixBlogImages,
  runWeeklyImageScan,
} from "@/lib/media/media-manager-service";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    const report = await buildMediaManagerReport();
    return apiSuccess(report);
  } catch (err) {
    console.error("Media manager report error:", err);
    return apiError("Failed to build media report", 500);
  }
}

const postSchema = z.object({
  actorRole: z.string(),
  action: z.enum([
    "bulk-fix-blogs",
    "bulk-fix-catalog",
    "bulk-fix-all",
    "weekly-scan",
  ]),
  mirrorToFirebase: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    switch (parsed.data.action) {
      case "weekly-scan": {
        const report = await runWeeklyImageScan();
        return apiSuccess({ report });
      }
      case "bulk-fix-blogs": {
        const result = await bulkFixBlogImages({
          mirrorToFirebase: parsed.data.mirrorToFirebase,
        });
        return apiSuccess({ result });
      }
      case "bulk-fix-catalog": {
        const result = await bulkEnrichCatalogImages();
        return apiSuccess({ result });
      }
      case "bulk-fix-all": {
        const blogs = await bulkFixBlogImages({
          mirrorToFirebase: parsed.data.mirrorToFirebase,
        });
        const catalog = await bulkEnrichCatalogImages();
        return apiSuccess({ blogs, catalog });
      }
      default:
        return apiError("Unknown action", 400);
    }
  } catch (err) {
    console.error("Media manager action error:", err);
    return apiError(err instanceof Error ? err.message : "Action failed", 500);
  }
}
