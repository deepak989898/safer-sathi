import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  generateBlogFromKeyword,
  hydrateAiCenterStore,
  listBlogs,
} from "@/lib/ai-center/repository";
import { attachBlogViewCounts } from "@/lib/blog-analytics/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    await hydrateAiCenterStore();
    const status = searchParams.get("status") as
      | "draft"
      | "pending_approval"
      | "approved"
      | "published"
      | "rejected"
      | null;

    const blogs = await attachBlogViewCounts(listBlogs(status ?? undefined));
    return apiSuccess({ blogs });
  } catch (err) {
    console.error("List blogs error:", err);
    return apiError("Failed to list blogs", 500);
  }
}

const createSchema = z.object({
  keywordId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const blog = await generateBlogFromKeyword(parsed.data.keywordId, auth.user.id);
    return apiSuccess({ blog });
  } catch (err) {
    console.error("Generate blog error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate blog", 500);
  }
}
