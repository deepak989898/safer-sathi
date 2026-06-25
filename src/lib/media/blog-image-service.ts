import type { BlogImagePrompt, KeywordCategory } from "@/lib/ai-center/types";
import { buildImageAlt, buildImageTitle } from "@/lib/seo/image-seo";
import {
  getDestinationCategory,
  normalizeImageUrl,
  resolveDestinationCategoryKey,
  type DestinationImageAsset,
} from "@/lib/media/destination-image-catalog";

export const BLOG_IMAGE_MIN = 4;
export const BLOG_IMAGE_MAX = 8;

export interface AssignBlogImagesInput {
  title: string;
  keyword: string;
  destination?: string;
  category?: KeywordCategory;
  /** Rotate offset when bulk-assigning blogs for the same destination */
  rotationIndex?: number;
  /** URLs already assigned in this bulk run — avoid cross-blog duplicates */
  reservedUrls?: Set<string>;
}

export interface AssignedBlogImages {
  featuredImage: string;
  imagePrompts: BlogImagePrompt[];
  destinationKey: string;
}

function scoreAssetForBlog(asset: DestinationImageAsset, haystack: string): number {
  let score = 0;
  const label = `${asset.label} ${asset.attraction ?? ""}`.toLowerCase();
  for (const token of haystack.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
    if (label.includes(token)) score += 3;
    if (haystack.includes(token) && label.includes(token.slice(0, 4))) score += 1;
  }
  if (asset.type === "featured") score += 2;
  return score;
}

function buildSeoFields(
  asset: DestinationImageAsset,
  destination: string,
  blogTitle: string
): Pick<BlogImagePrompt, "alt" | "title" | "caption" | "type"> {
  const subject = asset.attraction ?? asset.label;
  const alt = buildImageAlt(`${subject} — ${destination}`, blogTitle);
  const title = buildImageTitle(subject, destination);
  const caption = `${asset.label} — explore ${destination} with Safar Sathi`;
  return { alt, title, caption, type: asset.type };
}

function pickBlogImages(
  assets: DestinationImageAsset[],
  input: AssignBlogImagesInput,
  destinationKey: string
): DestinationImageAsset[] {
  const haystack = `${input.title} ${input.keyword} ${input.destination ?? ""}`.toLowerCase();
  const rotation = input.rotationIndex ?? 0;
  const reserved = input.reservedUrls ?? new Set<string>();

  const ranked = [...assets].sort((a, b) => {
    const scoreDiff = scoreAssetForBlog(b, haystack) - scoreAssetForBlog(a, haystack);
    if (scoreDiff !== 0) return scoreDiff;
    return a.id.localeCompare(b.id);
  });

  const rotated = [...ranked.slice(rotation % ranked.length), ...ranked.slice(0, rotation % ranked.length)];

  const picked: DestinationImageAsset[] = [];
  const usedIds = new Set<string>();
  const usedUrls = new Set<string>();

  for (const asset of rotated) {
    const normalized = normalizeImageUrl(asset.url);
    if (usedIds.has(asset.id) || usedUrls.has(normalized)) continue;
    if (reserved.has(normalized) && picked.length >= BLOG_IMAGE_MIN) continue;
    picked.push(asset);
    usedIds.add(asset.id);
    usedUrls.add(normalized);
    if (picked.length >= BLOG_IMAGE_MAX) break;
  }

  if (picked.length < BLOG_IMAGE_MIN) {
    for (const asset of assets) {
      if (picked.length >= BLOG_IMAGE_MIN) break;
      if (usedIds.has(asset.id)) continue;
      picked.push(asset);
      usedIds.add(asset.id);
    }
  }

  return picked.slice(0, BLOG_IMAGE_MAX);
}

export function assignBlogImages(input: AssignBlogImagesInput): AssignedBlogImages {
  const destinationKey = resolveDestinationCategoryKey(input.keyword, input.destination);
  const category = getDestinationCategory(destinationKey);
  const destination = input.destination?.trim() || category.displayName;
  const selected = pickBlogImages(category.images, input, destinationKey);

  const imagePrompts: BlogImagePrompt[] = selected.map((asset, index) => {
    const seo = buildSeoFields(asset, destination, input.title);
    return {
      id: asset.id || `img-${index}`,
      label: asset.label,
      prompt: `Travel photography of ${asset.attraction ?? asset.label} in ${destination}, editorial, no text`,
      url: asset.url,
      ...seo,
    };
  });

  const featured =
    imagePrompts.find((p) => p.type === "featured")?.url ??
    imagePrompts[0]?.url ??
    category.images[0].url;

  if (input.reservedUrls) {
    for (const prompt of imagePrompts) {
      input.reservedUrls.add(normalizeImageUrl(prompt.url));
    }
  }

  return {
    featuredImage: featured,
    imagePrompts,
    destinationKey,
  };
}

export function blogImagesFromExisting(blog: {
  title: string;
  keyword: string;
  destination?: string;
  featuredImage?: string;
  imagePrompts?: BlogImagePrompt[];
}): AssignedBlogImages {
  const fresh = assignBlogImages({
    title: blog.title,
    keyword: blog.keyword,
    destination: blog.destination,
  });

  const savedFeatured = blog.featuredImage?.trim();
  const savedPrompts = blog.imagePrompts?.filter((p) => p.url?.trim()) ?? [];

  if (savedPrompts.length >= BLOG_IMAGE_MIN) {
    return {
      featuredImage: savedFeatured || savedPrompts[0].url,
      imagePrompts: savedPrompts.map((p, i) => ({
        ...p,
        alt: p.alt || buildImageAlt(p.label, blog.title),
        title: p.title || buildImageTitle(p.label, blog.destination),
        caption: p.caption || `${p.label} — ${blog.destination ?? "India"}`,
        type: p.type ?? (i === 0 ? "featured" : "destination"),
      })),
      destinationKey: resolveDestinationCategoryKey(blog.keyword, blog.destination),
    };
  }

  return {
    ...fresh,
    featuredImage: savedFeatured || fresh.featuredImage,
  };
}
