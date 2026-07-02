import {
  estimateOpenAiImageCostUsd,
  generateOpenAIImage,
  isOpenAIImagesConfigured,
  OPENAI_IMAGE_MODEL,
  type OpenAiImageGenerateOptions,
  type OpenAiImageQuality,
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

const CATEGORY_SCENES: Record<KeywordCategory, string> = {
  tour_packages:
    "iconic landmarks, scenic routes, and authentic travel experiences that match the package theme",
  hotels: "premium hotel exterior or elegant room with destination skyline or landscape visible",
  vehicles: "scenic Indian highway or mountain road with a travel vehicle in natural context",
  destinations:
    "the most recognizable landmark, ghat, temple, lake, or landscape of the destination",
  travel_guides: "local culture, street life, food, or heritage sites visitors would explore",
  local: "authentic local neighborhood, market, or cultural scene at the destination",
};

export interface OpenAiImageEnrichmentResult {
  attempted: boolean;
  success: boolean;
  message?: string;
  blog?: AiBlogPost;
}

export interface OpenAiImageEnrichmentOptions {
  /** Replace an existing OpenAI/catalog featured image (e.g. blog Regenerate). */
  forceRegenerate?: boolean;
}

function extractRouteCities(keyword: string): { from?: string; to?: string } {
  const match = keyword.match(/\b([A-Za-z][\w\s-]{1,40}?)\s+to\s+([A-Za-z][\w\s-]{1,40})\b/i);
  if (!match) return {};
  return {
    from: match[1].trim(),
    to: match[2].trim(),
  };
}

function buildSceneBrief(blog: AiBlogPost, destination: string): string {
  const keyword = blog.keyword.trim();
  const route = extractRouteCities(keyword);
  const scene = CATEGORY_SCENES[blog.category] ?? CATEGORY_SCENES.destinations;

  if (route.to) {
    return [
      `Main subject: the famous scenery and landmarks of ${route.to}, India`,
      `(travel route theme: ${route.from} to ${route.to}).`,
      `Show ${scene}.`,
    ].join(" ");
  }

  return `Main subject: ${destination}, India — show ${scene}.`;
}

function buildOpenAiImagePrompt(blog: AiBlogPost): string {
  const destination = resolveDestinationName(blog.keyword, blog.destination);
  const keyword = blog.keyword.trim();
  const sceneBrief = buildSceneBrief(blog, destination);

  return [
    `Photorealistic editorial travel photograph for an Indian tourism blog.`,
    `Article title: "${blog.title}".`,
    sceneBrief,
    `Keyword context: "${keyword}".`,
    "Composition: wide landscape blog hero, rule of thirds, single clear focal point, clean horizon.",
    "Camera: full-frame DSLR, 24mm wide-angle lens, f/8, tack-sharp focus, natural depth of field.",
    "Lighting: golden hour or soft daylight, realistic colors, high dynamic range, no oversaturated HDR look.",
    "People: optional small distant figures only — no close-up faces, no distorted hands.",
    "Strictly avoid: text, logos, watermarks, borders, collage, cartoon, illustration, painting, blur, noise, AI artifacts.",
  ].join(" ");
}

function resolveImageOptions(settings: AiCenterSettings): OpenAiImageGenerateOptions {
  return {
    model: settings.openAiImageModel ?? "gpt-image-1",
    quality: settings.openAiImageQuality ?? "high",
    size: "1536x1024",
  };
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
  actorId: string,
  options?: OpenAiImageEnrichmentOptions
): Promise<OpenAiImageEnrichmentResult> {
  if (!settings.openAiImagesEnabled) {
    return { attempted: false, success: false };
  }

  if (
    !options?.forceRegenerate &&
    blog.imageGenerated &&
    blog.imageSource === "openai" &&
    blog.featuredImage
  ) {
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

  const imageOptions = resolveImageOptions(settings);
  const estimatedCostUsd = estimateOpenAiImageCostUsd(imageOptions);

  try {
    const prompt = buildOpenAiImagePrompt(blog);
    const buffer = await generateOpenAIImage(prompt, imageOptions);
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
      estimatedCostUsd,
    });

    return { attempted: true, success: true, blog: updated };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "OpenAI image failed";
    const modelHint = `model=${imageOptions.model ?? OPENAI_IMAGE_MODEL}, quality=${imageOptions.quality ?? "high"}`;
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

export type { OpenAiImageQuality };
