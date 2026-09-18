import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { generateBlogFromManualTitle } from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(8).max(200),
  imageMode: z.enum(["catalog", "unsplash", "pexels", "ai"]).default("catalog"),
  autoPublish: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await generateBlogFromManualTitle(
      parsed.data.title,
      auth.user.id,
      {
        imageMode: parsed.data.imageMode,
        forcePublish: parsed.data.autoPublish !== false,
      }
    );

    return apiSuccess(result);
  } catch (err) {
    console.error("Generate blog from title error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to generate blog from title",
      500
    );
  }
}
