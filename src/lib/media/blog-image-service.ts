import type { BlogImagePrompt, KeywordCategory } from "@/lib/ai-center/types";
import {
  selectIntelligentBlogImages,
  minImagesForWordCount,
  BLOG_IMAGE_MAX,
  createFeaturedUsageTracker,
  RELEVANCE_THRESHOLD,
} from "@/lib/media/image-intelligence-engine";
import { resolveDestinationCategoryKey } from "@/lib/media/destination-image-catalog";
import { stableBlogRotation } from "@/lib/media/image-intelligence-engine";
import { isBannedAltText } from "@/lib/media/image-seo-generator";

export { BLOG_IMAGE_MAX, minImagesForWordCount };

export interface AssignBlogImagesInput {
  title: string;
  keyword: string;
  destination?: string;
  category?: KeywordCategory;
  wordCount?: number;
  rotationIndex?: number;
  reservedUrls?: Set<string>;
  featuredTracker?: ReturnType<typeof createFeaturedUsageTracker>;
}

export interface AssignedBlogImages {
  featuredImage: string;
  imagePrompts: BlogImagePrompt[];
  destinationKey: string;
  averageScore: number;
  minRequired: number;
}

export function assignBlogImages(input: AssignBlogImagesInput): AssignedBlogImages {
  const result = selectIntelligentBlogImages(input);
  return {
    featuredImage: result.featuredImage,
    imagePrompts: result.imagePrompts,
    destinationKey: result.destinationKey,
    averageScore: result.averageScore,
    minRequired: result.minRequired,
  };
}

export function blogImagesFromExisting(blog: {
  title: string;
  keyword: string;
  destination?: string;
  wordCount?: number;
  featuredImage?: string;
  imagePrompts?: BlogImagePrompt[];
}): AssignedBlogImages {
  const savedPrompts = blog.imagePrompts?.filter((p) => p.url?.trim()) ?? [];
  const minRequired = minImagesForWordCount(blog.wordCount ?? 1200);

  const hasFullSeo =
    savedPrompts.length >= minRequired &&
    savedPrompts.every((p) => {
      const alt = p.altText ?? p.alt ?? "";
      return alt.trim() && !isBannedAltText(alt) && p.caption && p.imageScore !== undefined;
    });

  if (hasFullSeo && savedPrompts.length >= minRequired) {
    const uniqueUrls = new Set(savedPrompts.map((p) => p.url));
    const avgScore =
      savedPrompts.reduce((s, p) => s + (p.imageScore ?? 0), 0) / savedPrompts.length;
    if (uniqueUrls.size >= minRequired && avgScore >= RELEVANCE_THRESHOLD) {
      return {
        featuredImage: blog.featuredImage?.trim() || savedPrompts[0].url,
        imagePrompts: savedPrompts,
        destinationKey: resolveDestinationCategoryKey(blog.keyword, blog.destination),
        averageScore: Math.round(avgScore),
        minRequired,
      };
    }
  }

  const fresh = assignBlogImages({
    title: blog.title,
    keyword: blog.keyword,
    destination: blog.destination,
    wordCount: blog.wordCount,
    rotationIndex: stableBlogRotation(blog.title + blog.keyword),
  });

  return fresh;
}
