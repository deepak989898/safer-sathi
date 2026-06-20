import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  generateBlogFromKeyword,
  hydrateAiCenterStore,
  listBlogs,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiCenterStore();
    const status = searchParams.get("status") as
      | "draft"
      | "pending_approval"
      | "approved"
      | "published"
      | "rejected"
      | null;

    return apiSuccess({ blogs: listBlogs(status ?? undefined) });
  } catch (err) {
    console.error("List blogs error:", err);
    return apiError("Failed to list blogs", 500);
  }
}

const createSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  keywordId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    const blog = await generateBlogFromKeyword(
      parsed.data.keywordId,
      parsed.data.actorId
    );
    return apiSuccess({ blog });
  } catch (err) {
    console.error("Generate blog error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate blog", 500);
  }
}
