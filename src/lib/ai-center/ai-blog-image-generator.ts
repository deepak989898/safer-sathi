import {
  generateOpenAIImage,
  isOpenAIImagesConfigured,
  OPENAI_IMAGE_ESTIMATED_COST_USD,
  OPENAI_IMAGE_MODEL,
} from "@/lib/ai/openai-images";
import {
  addImageGenerationLog,
  countSuccessfulImagesThisMonth,
} from "@/lib/ai-center/image-generation-logs";
import { resolveDestinationName } from "@/lib/ai-center/blog-reference-data";
import type { AiBlogPost, AiCenterSettings, KeywordCategory } from "@/lib/ai-center/types";
import { slugify } from "@/lib/ai-center/utils";
import { uploadAdminImageBuffer, isFirebaseStorageConfigured } from "@/lib/firebase/admin-storage";
import {
  generateImageAltText,
  generateImageCaption,
  generateImageTitle,
  generateSeoFileName,
} from "@/lib/media/image-seo-generator";

const CATEGORY_HINTS: Record<KeywordCategory, string> = {
  tour_packages: "tour packages and sightseeing attractions",
  hotels: "hotels and premium stays",
  vehicles: "travel vehicles and road trips",
  destinations: "travel destination highlights",
  travel_guides: "travel guide and local experiences",
  local: "local travel experiences",
};

export interface OpenAiImageEnrichmentResult {
  attempted: boolean;
  success: boolean;
  message?: string;
  blog?: AiBlogPost;
}

function buildOpenAiImagePrompt(blog: AiBlogPost): string {
  const destination = resolveDestinationName(blog.keyword, blog.destination);
  const categoryHint = CATEGORY_HINTS[blog.category] ?? "travel destination";
  const keyword = blog.keyword.trim();

  return [
    `Create a realistic travel photograph of ${destination}, inspired by the topic "${blog.title}" and keyword "${keyword}".`,
    `Focus on ${categoryHint}.`,
    "Style: professional travel photography, natural colors, natural lighting.",
    "No text, logos, watermarks, borders, or collage.",
    "Suitable as a professional travel blog hero image.",
  ].join(" ");
}

function buildFeaturedPromptEntry(
  blog: AiBlogPost,
  imageUrl: string,
  fileName: string
) {
  const destination = resolveDestinationName(blog.keyword, blog.destination);
  const subject = blog.title.replace(/^top\s+\d+\s+/i, "").slice(0, 60);

  const altText = generateImageAltText({
    destination,
    subject,
    context: "for travel blog",
  });
  const title = generateImageTitle({ destination, subject });
  const caption = generateImageCaption({ destination, subject });

  return {
    id: `openai_featured_${blog.slug}`,
    label: "Featured (OpenAI)",
    prompt: buildOpenAiImagePrompt(blog),
    url: imageUrl,
    type: "featured" as const,
    alt: altText,
    altText,
    title,
    caption,
    keywords: [blog.keyword, destination].filter(Boolean),
    destination,
    category: blog.category,
    imageScore: 95,
    placement: "top" as const,
    fileName,
  };
}

function replaceFeaturedInPrompts(
  blog: AiBlogPost,
  featuredEntry: ReturnType<typeof buildFeaturedPromptEntry>
) {
  const others = (blog.imagePrompts ?? []).filter(
    (p) => p.type !== "featured" && p.placement !== "top"
  );
  return [featuredEntry, ...others];
}

function failureMessage(reason: string): string {
  return `AI image generation failed: ${reason}. Existing catalog image was kept.`;
}

/** Optional post-step: swap featured image with one OpenAI-generated hero. */
export async function enrichBlogWithOpenAiFeaturedImage(
  blog: AiBlogPost,
  settings: AiCenterSettings,
  actorId: string
): Promise<OpenAiImageEnrichmentResult> {
  if (!settings.openAiImagesEnabled) {
    return { attempted: false, success: false };
  }

  if (blog.imageGenerated && blog.imageSource === "openai" && blog.featuredImage) {
    return {
      attempted: false,
      success: true,
      message: "Existing OpenAI featured image reused.",
      blog,
    };
  }

  if (!isOpenAIImagesConfigured()) {
    const reason = "OpenAI API key not configured on server (OPENAI_API_KEY)";
    await addImageGenerationLog({
      blogId: blog.id,
      blogTitle: blog.title,
      keyword: blog.keyword,
      destination: blog.destination,
      success: false,
      imageSource: "catalog",
      generatedBy: actorId,
      error: reason,
    });
    return {
      attempted: true,
      success: false,
      message: failureMessage(reason),
      blog,
    };
  }

  if (!isFirebaseStorageConfigured()) {
    const reason =
      "Firebase Storage not configured on server (set FIREBASE_STORAGE_BUCKET in Vercel env)";
    await addImageGenerationLog({
      blogId: blog.id,
      blogTitle: blog.title,
      keyword: blog.keyword,
      destination: blog.destination,
      success: false,
      imageSource: "catalog",
      generatedBy: actorId,
      error: reason,
    });
    return {
      attempted: true,
      success: false,
      message: failureMessage(reason),
      blog,
    };
  }

  const monthlyCount = countSuccessfulImagesThisMonth();
  if (monthlyCount >= settings.openAiImagesMonthlyLimit) {
    const reason = `Monthly image limit reached (${settings.openAiImagesMonthlyLimit} this month)`;
    await addImageGenerationLog({
      blogId: blog.id,
      blogTitle: blog.title,
      keyword: blog.keyword,
      destination: blog.destination,
      success: false,
      imageSource: "catalog",
      generatedBy: actorId,
      error: reason,
    });
    return {
      attempted: true,
      success: false,
      message: failureMessage(reason),
      blog,
    };
  }

  try {
    const prompt = buildOpenAiImagePrompt(blog);
    const buffer = await generateOpenAIImage(prompt);
    const fileName = generateSeoFileName(
      resolveDestinationName(blog.keyword, blog.destination),
      slugify(blog.title).slice(0, 40) || "featured",
      "featured"
    );
    const imageUrl = await uploadAdminImageBuffer(
      buffer,
      "image/png",
      "blogs",
      fileName.replace(/\.webp$/i, "")
    );

    const featuredEntry = buildFeaturedPromptEntry(blog, imageUrl, fileName);
    const now = new Date().toISOString();

    const updated: AiBlogPost = {
      ...blog,
      featuredImage: imageUrl,
      imagePrompts: replaceFeaturedInPrompts(blog, featuredEntry),
      imageSource: "openai",
      imageGenerated: true,
      imageGeneratedAt: now,
      updatedAt: now,
    };

    await addImageGenerationLog({
      blogId: blog.id,
      blogTitle: blog.title,
      keyword: blog.keyword,
      destination: blog.destination,
      success: true,
      imageSource: "openai",
      generatedBy: actorId,
      estimatedCostUsd: OPENAI_IMAGE_ESTIMATED_COST_USD,
    });

    return { attempted: true, success: true, blog: updated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI image failed";
    const modelHint = `model=${OPENAI_IMAGE_MODEL}`;
    const fullError = `${errorMessage} [${modelHint}]`;

    await addImageGenerationLog({
      blogId: blog.id,
      blogTitle: blog.title,
      keyword: blog.keyword,
      destination: blog.destination,
      success: false,
      imageSource: "catalog",
      generatedBy: actorId,
      error: fullError,
    });

    return {
      attempted: true,
      success: false,
      message: failureMessage(fullError),
      blog,
    };
  }
}
