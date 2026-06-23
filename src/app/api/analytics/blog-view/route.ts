import { incrementBlogView } from "@/lib/blog-analytics/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid request", 400);

    await incrementBlogView(parsed.data.slug, parsed.data.title);
    return apiSuccess({ tracked: true });
  } catch (err) {
    console.error("blog-view track error:", err);
    return apiError("Failed to track blog view", 500);
  }
}
