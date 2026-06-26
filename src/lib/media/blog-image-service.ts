import type { BlogImagePrompt, KeywordCategory } from "@/lib/ai-center/types";
import {
  selectIntelligentBlogImages,
  minImagesForWordCount,
  BLOG_IMAGE_MAX,
  createFeaturedUsageTracker,
  RELEVANCE_THRESHOLD,
} from "@/lib/media/image-intelligence-engine";
import { imageIdentityKey, resolveDestinationCategoryKey } from "@/lib/media/destination-image-catalog";
import { stableBlogRotation } from "@/lib/media/image-intelligence-engine";
import { isBannedAltText } from "@/lib/media/image-seo-generator";

export { BLOG_IMAGE_MAX, minImagesForWordCount };

export interface AssignBlogImagesInput {
  title: string;
  keyword: string;
  destination?: string;
  category?: KeywordCategory;
  wordCount?: number;
  slug?: string;
  rotationIndex?: number;
  reservedUrls?: Set<string>;
  reservedPhotoIds?: Set<string>;
  featuredTracker?: ReturnType<typeof createFeaturedUsageTracker>;
}

export interface BlogImageAssignmentSession {
  reservedUrls: Set<string>;
  reservedPhotoIds: Set<string>;
  featuredTracker: ReturnType<typeof createFeaturedUsageTracker>;
}

export function createBlogImageAssignmentSession(): BlogImageAssignmentSession {
  return {
    reservedUrls: new Set<string>(),
    reservedPhotoIds: new Set<string>(),
    featuredTracker: createFeaturedUsageTracker(),
  };
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
  slug?: string;
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
    slug: blog.slug || blog.title,
    rotationIndex: stableBlogRotation(blog.slug || `${blog.title}:${blog.keyword}`),
  });

  return fresh;
}

/** Seed reserved sets from existing blogs so new assignments avoid site-wide duplicates. */
export function seedBlogImageSessionFromBlogs(
  session: BlogImageAssignmentSession,
  blogs: Array<{ featuredImage?: string; imagePrompts?: BlogImagePrompt[] }>
): void {
  for (const blog of blogs) {
    const urls = [
      blog.featuredImage,
      ...(blog.imagePrompts?.map((p) => p.url) ?? []),
    ].filter(Boolean) as string[];
    for (const url of urls) {
      session.reservedUrls.add(url.split("?")[0] ?? url);
      session.reservedPhotoIds.add(imageIdentityKey(url));
      session.featuredTracker.counts.set(
        imageIdentityKey(url),
        (session.featuredTracker.counts.get(imageIdentityKey(url)) ?? 0) + 1
      );
    }
  }
}
