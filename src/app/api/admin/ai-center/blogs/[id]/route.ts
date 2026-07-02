import type { BlogImagePrompt } from "@/lib/ai-center/types";
import { enrichBlogWithOpenAiFeaturedImage } from "@/lib/ai-center/ai-blog-image-generator";
import { regenerateBlogContent } from "@/lib/ai-center/blog-writer-agent";
import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  approveBlog,
  deleteBlog,
  getAiCenterSettings,
  getBlogById,
  hydrateAiCenterStore,
  publishBlog,
  rejectBlog,
  updateBlog,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["update", "approve", "reject", "publish", "regenerate"]),
  title: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  imagePrompts: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        prompt: z.string(),
        url: z.string(),
        type: z.enum(["featured", "destination", "activity", "attraction", "experience"]).optional(),
        alt: z.string().optional(),
        altText: z.string().optional(),
        title: z.string().optional(),
        caption: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        destination: z.string().optional(),
        category: z.string().optional(),
        imageScore: z.number().optional(),
        placement: z
          .enum(["top", "content-25", "content-50", "content-75", "bottom"])
          .optional(),
        fileName: z.string().optional(),
      })
    )
    .optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    await hydrateAiCenterStore();
    const actor = auth.user.id;

    switch (parsed.data.action) {
      case "update": {
        const blog = await updateBlog(id, {
          ...(parsed.data.title ? { title: parsed.data.title } : {}),
          ...(parsed.data.content ? { content: parsed.data.content } : {}),
          ...(parsed.data.excerpt ? { excerpt: parsed.data.excerpt } : {}),
          ...(parsed.data.featuredImage ? { featuredImage: parsed.data.featuredImage } : {}),
          ...(parsed.data.imagePrompts
            ? { imagePrompts: parsed.data.imagePrompts as BlogImagePrompt[] }
            : {}),
          ...(parsed.data.metaTitle ? { metaTitle: parsed.data.metaTitle } : {}),
          ...(parsed.data.metaDescription
            ? { metaDescription: parsed.data.metaDescription }
            : {}),
        });
        return apiSuccess({ blog });
      }
      case "approve": {
        const blog = await approveBlog(id, actor);
        return apiSuccess({ blog });
      }
      case "reject": {
        const blog = await rejectBlog(id, parsed.data.reason);
        return apiSuccess({ blog });
      }
      case "publish": {
        const blog = await publishBlog(id, actor);
        return apiSuccess({ blog });
      }
      case "regenerate": {
        const existing = getBlogById(id);
        if (!existing) return apiError("Blog not found", 404);
        const settings = getAiCenterSettings();
        const regenerated = await regenerateBlogContent(existing, settings);
        let blog = await updateBlog(id, regenerated);

        if (settings.openAiImagesEnabled) {
          const enrichment = await enrichBlogWithOpenAiFeaturedImage(
            blog,
            settings,
            actor,
            { forceRegenerate: true }
          );
          if (enrichment.success && enrichment.blog) {
            blog = await updateBlog(id, enrichment.blog);
          }
        }

        return apiSuccess({ blog });
      }
      default:
        return apiError("Unknown action", 400);
    }
  } catch (err) {
    console.error("Blog action error:", err);
    return apiError(err instanceof Error ? err.message : "Action failed", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    await hydrateAiCenterStore();
    await deleteBlog(id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("Delete blog error:", err);
    return apiError("Failed to delete blog", 500);
  }
}
