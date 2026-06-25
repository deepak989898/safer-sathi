import { assignBlogImages } from "@/lib/media/blog-image-service";
import { resolveDestinationCategoryKey } from "@/lib/media/destination-image-catalog";
import type { BlogImagePrompt } from "@/lib/ai-center/types";

/** @deprecated Use assignBlogImages from blog-image-service — kept for backward compatibility */
export function resolveBlogImageKey(keyword: string, explicitDestination?: string): string {
  return resolveDestinationCategoryKey(keyword, explicitDestination);
}

export function getBlogImagePrompts(keyword: string, destination?: string): BlogImagePrompt[] {
  const assigned = assignBlogImages({
    title: keyword,
    keyword,
    destination,
  });
  return assigned.imagePrompts;
}

export function getBlogFeaturedImage(keyword: string, destination?: string): string {
  return assignBlogImages({
    title: keyword,
    keyword,
    destination,
  }).featuredImage;
}

export function resolveBlogFeaturedImage(blog: {
  featuredImage?: string;
  keyword: string;
  destination?: string;
}): string {
  const saved = blog.featuredImage?.trim();
  if (saved) return saved;
  return getBlogFeaturedImage(blog.keyword, blog.destination);
}

export function getDestinationImageSet(keyword: string, explicitDestination?: string) {
  const assigned = assignBlogImages({
    title: keyword,
    keyword,
    destination: explicitDestination,
  });
  const prompts = assigned.imagePrompts;
  return {
    hero: prompts[0]?.url ?? "",
    places: prompts.find((p) => p.type === "attraction")?.url ?? prompts[1]?.url ?? "",
    activities: prompts.find((p) => p.type === "activity")?.url ?? prompts[2]?.url ?? "",
    hotels: prompts.find((p) => p.type === "experience")?.url ?? prompts[3]?.url ?? "",
    banner: prompts[prompts.length - 1]?.url ?? prompts[0]?.url ?? "",
  };
}
