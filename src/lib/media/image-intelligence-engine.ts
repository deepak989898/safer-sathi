import { getDestinationBlogReference } from "@/lib/ai-center/blog-reference-data";
import type { BlogImagePrompt, BlogImageType, KeywordCategory } from "@/lib/ai-center/types";
import {
  DESTINATION_IMAGE_CATALOG,
  getDestinationCategory,
  imageIdentityKey,
  normalizeImageUrl,
  resolveDestinationCategoryKey,
  type DestinationImageAsset,
  type ImageSlotType,
} from "@/lib/media/destination-image-catalog";
import { detectBlogTravelMode } from "@/lib/media/route-city-images";
import {
  buildImageKeywords,
  generateImageAltText,
  generateImageCaption,
  generateImageTitle,
  generateSeoFileName,
  isBannedAltText,
  optimizeImageUrl,
  passesImageQualityGate,
} from "@/lib/media/image-seo-generator";

export const RELEVANCE_THRESHOLD = 80;
export const FEATURED_MAX_REUSE = 3;
export const SITE_IMAGE_MAX_REUSE = 2;
export const BLOG_IMAGE_MAX = 8;

export type ImagePlacement = "top" | "content-25" | "content-50" | "content-75" | "bottom";

const PLACEMENT_ORDER: ImagePlacement[] = [
  "top",
  "content-25",
  "content-50",
  "content-75",
  "bottom",
];

const PLACEMENT_BY_TYPE: Partial<Record<ImageSlotType, ImagePlacement>> = {
  featured: "top",
  destination: "content-25",
  activity: "content-50",
  attraction: "content-75",
  experience: "bottom",
};

function priorityTier(asset: DestinationImageAsset, destinationKey: string): number {
  if (destinationKey === "india") return asset.type === "experience" ? 4 : 3;
  if (asset.type === "featured" || asset.type === "destination") return 1;
  if (asset.type === "activity") return 2;
  if (asset.type === "attraction") return 3;
  return 4;
}

export interface BlogImageContext {
  title: string;
  keyword: string;
  destination: string;
  destinationKey: string;
  category?: KeywordCategory;
  wordCount: number;
  activities: string[];
  attractions: string[];
  keywords: string[];
}

export interface ScoredImageAsset extends DestinationImageAsset {
  relevanceScore: number;
  priorityTier: number;
}

export interface FeaturedUsageTracker {
  counts: Map<string, number>;
  maxReuse: number;
}

export function createFeaturedUsageTracker(maxReuse = FEATURED_MAX_REUSE): FeaturedUsageTracker {
  return { counts: new Map(), maxReuse };
}

export function canUseFeaturedUrl(tracker: FeaturedUsageTracker, url: string): boolean {
  const key = imageIdentityKey(url);
  return (tracker.counts.get(key) ?? 0) < tracker.maxReuse;
}

export function markFeaturedUsed(tracker: FeaturedUsageTracker, url: string): void {
  const key = imageIdentityKey(url);
  tracker.counts.set(key, (tracker.counts.get(key) ?? 0) + 1);
}

export function minImagesForWordCount(wordCount: number): number {
  if (wordCount >= 2500) return 8;
  if (wordCount >= 1500) return 6;
  return 4;
}

export function extractBlogImageContext(input: {
  title: string;
  keyword: string;
  destination?: string;
  category?: KeywordCategory;
  wordCount?: number;
}): BlogImageContext {
  const destinationKey = resolveDestinationCategoryKey(
    input.keyword,
    input.destination,
    input.title
  );
  const category = getDestinationCategory(destinationKey);
  const destination = input.destination?.trim() || category.displayName;
  const ref = getDestinationBlogReference(input.keyword, destination);

  const keywords = [
    ...input.keyword.toLowerCase().split(/\s+/),
    ...input.title.toLowerCase().split(/\s+/),
    destination.toLowerCase(),
    destinationKey,
  ].filter((k) => k.length > 2);

  return {
    title: input.title,
    keyword: input.keyword,
    destination,
    destinationKey,
    category: input.category,
    wordCount: input.wordCount ?? 1200,
    activities: ref.activities.map((a) => a.toLowerCase()),
    attractions: ref.attractions.map((a) => a.toLowerCase()),
    keywords: [...new Set(keywords)],
  };
}

export function computeImageRelevanceScore(
  asset: DestinationImageAsset,
  ctx: BlogImageContext
): number {
  const haystack = `${ctx.title} ${ctx.keyword} ${ctx.destination} ${ctx.keywords.join(" ")}`.toLowerCase();
  const subject = `${asset.label} ${asset.attraction ?? ""}`.toLowerCase();
  let score = 35;

  const tier = priorityTier(asset, ctx.destinationKey);
  if (tier === 1) score += 22;
  else if (tier === 2) score += 16;
  else if (tier === 3) score += 12;
  else score += 6;

  const category = getDestinationCategory(ctx.destinationKey);
  const cityTokens = [
    category.displayName.toLowerCase(),
    ctx.destinationKey,
    ...category.displayName.toLowerCase().split(/\s+/),
  ].filter((t) => t.length > 2);

  let cityMatch = false;
  for (const token of cityTokens) {
    if (haystack.includes(token) && (subject.includes(token) || asset.id.includes(token))) {
      score += 18;
      cityMatch = true;
      break;
    }
  }
  if (!cityMatch && ctx.destinationKey !== "india" && asset.id.startsWith("india-")) {
    score -= 35;
  }

  for (const attraction of ctx.attractions) {
    const short = attraction.split("(")[0].trim();
    if (subject.includes(short.slice(0, 12)) || haystack.includes(short.slice(0, 12))) {
      score += 12;
    }
  }

  for (const activity of ctx.activities) {
    if (subject.includes(activity.slice(0, 10)) || haystack.includes(activity.slice(0, 10))) {
      score += 10;
    }
    if (asset.type === "activity" && haystack.includes("adventure")) score += 6;
  }

  for (const token of ctx.keywords) {
    if (token.length > 3 && subject.includes(token)) score += 4;
  }

  const travelMode = detectBlogTravelMode(ctx.keyword, ctx.title);
  if (travelMode === "cab" && asset.id.includes("cab")) score += 20;
  if (travelMode === "bus" && asset.id.includes("bus")) score += 20;
  if (travelMode === "train" && asset.id.includes("train")) score += 20;
  if (travelMode === "package" && asset.id.includes("pkg")) score += 15;

  if (ctx.destinationKey !== "india" && asset.id.startsWith("india-")) score -= 25;
  if (!passesImageQualityGate(asset.url)) score -= 40;

  if (!cityMatch && ctx.destinationKey !== "india" && score < RELEVANCE_THRESHOLD) {
    return Math.min(score, RELEVANCE_THRESHOLD - 5);
  }

  return Math.min(100, Math.max(0, score));
}

function scoreAndRankAssets(
  assets: DestinationImageAsset[],
  ctx: BlogImageContext
): ScoredImageAsset[] {
  return assets
    .map((asset) => ({
      ...asset,
      relevanceScore: computeImageRelevanceScore(asset, ctx),
      priorityTier: priorityTier(asset, ctx.destinationKey),
    }))
    .filter((a) => a.relevanceScore >= RELEVANCE_THRESHOLD)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
      return a.id.localeCompare(b.id);
    });
}

export function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function stableBlogRotation(seed: string): number {
  return stableHash(seed) % 97;
}

function buildImagePool(ctx: BlogImageContext, travelMode: ReturnType<typeof detectBlogTravelMode>) {
  const destinationImages = getDestinationCategory(ctx.destinationKey).images;
  const pools: DestinationImageAsset[] = [];

  if (travelMode !== "destination") {
    const transportKey = `transport_${travelMode}` as keyof typeof DESTINATION_IMAGE_CATALOG;
    const transportImages = getDestinationCategory(transportKey).images;
    pools.push(...transportImages);
  }

  pools.push(...destinationImages);

  if (ctx.destinationKey === "india" && travelMode === "destination") {
    return destinationImages;
  }

  return pools;
}

function pickFeaturedImage(
  imagePrompts: BlogImagePrompt[],
  travelMode: ReturnType<typeof detectBlogTravelMode>,
  tracker: FeaturedUsageTracker
): string {
  const preferTransport = travelMode !== "destination";
  const candidates = preferTransport
    ? imagePrompts.filter((p) => p.type === "featured" || p.placement === "top")
    : imagePrompts;

  for (const prompt of candidates) {
    if (canUseFeaturedUrl(tracker, prompt.url)) return prompt.url;
  }

  for (const prompt of imagePrompts) {
    if (canUseFeaturedUrl(tracker, prompt.url)) return prompt.url;
  }

  return imagePrompts[0]?.url ?? "";
}

function pickPlacement(index: number, type: ImageSlotType): ImagePlacement {
  return PLACEMENT_BY_TYPE[type] ?? PLACEMENT_ORDER[Math.min(index, PLACEMENT_ORDER.length - 1)];
}

function buildPromptFromAsset(
  asset: ScoredImageAsset,
  ctx: BlogImageContext,
  placement: ImagePlacement,
  index: number
): BlogImagePrompt {
  const subject = asset.attraction ?? asset.label;
  const season =
    ctx.keyword.toLowerCase().includes("winter") || ctx.keyword.toLowerCase().includes("snow")
      ? "winter season"
      : ctx.keyword.toLowerCase().includes("summer")
        ? "summer season"
        : undefined;

  const altText = generateImageAltText({
    destination: ctx.destination,
    subject,
    context: asset.type === "activity" ? "adventure travel experience" : "scenic travel destination",
    season,
  });

  const title = generateImageTitle({
    destination: ctx.destination,
    subject,
    action:
      asset.type === "activity"
        ? "Adventure Activities"
        : asset.type === "attraction"
          ? "Top Attraction"
          : undefined,
  });

  const caption = generateImageCaption({
    destination: ctx.destination,
    subject,
    detail:
      asset.type === "activity"
        ? `Popular ${subject.toLowerCase()} destination`
        : `Stunning view of ${subject}`,
  });

  const keywords = buildImageKeywords({
    destination: ctx.destination,
    subject,
    category: ctx.category,
    attraction: asset.attraction,
  });

  const optimizedUrl = optimizeImageUrl(asset.url);
  const fileName = generateSeoFileName(ctx.destination, subject, asset.type);

  return {
    id: asset.id || `img-${index}`,
    label: asset.label,
    prompt: `Editorial travel photo of ${subject} in ${ctx.destination}, 16:9, high quality, no watermark`,
    url: optimizedUrl,
    type: asset.type as BlogImageType,
    alt: altText,
    altText,
    title,
    caption,
    keywords,
    destination: ctx.destination,
    category: ctx.category,
    imageScore: asset.relevanceScore,
    placement,
    fileName,
  };
}

export interface IntelligentImageSelectionInput {
  title: string;
  keyword: string;
  destination?: string;
  category?: KeywordCategory;
  wordCount?: number;
  slug?: string;
  rotationIndex?: number;
  reservedUrls?: Set<string>;
  reservedPhotoIds?: Set<string>;
  featuredTracker?: FeaturedUsageTracker;
}

export interface IntelligentImageSelectionResult {
  featuredImage: string;
  imagePrompts: BlogImagePrompt[];
  destinationKey: string;
  minRequired: number;
  averageScore: number;
}

export function selectIntelligentBlogImages(
  input: IntelligentImageSelectionInput
): IntelligentImageSelectionResult {
  const ctx = extractBlogImageContext(input);
  const travelMode = detectBlogTravelMode(input.keyword, input.title);
  const minRequired = minImagesForWordCount(ctx.wordCount);
  const maxCount = Math.min(BLOG_IMAGE_MAX, Math.max(minRequired, 4));

  const pool = buildImagePool(ctx, travelMode);
  let ranked = scoreAndRankAssets(pool, ctx);

  if (ranked.length < minRequired) {
    const fallbackPool = [
      ...getDestinationCategory(ctx.destinationKey).images,
      ...(travelMode !== "destination"
        ? getDestinationCategory(`transport_${travelMode}`).images
        : []),
    ];
    ranked = scoreAndRankAssets(fallbackPool, ctx).filter(
      (a) => a.relevanceScore >= RELEVANCE_THRESHOLD - 5
    );
  }

  const hashRotation =
    input.rotationIndex ??
    stableHash(
      `${input.slug ?? ""}:${input.keyword}:${input.title}:${ctx.destinationKey}:${travelMode}`
    ) % Math.max(ranked.length, 1);
  const rotated = [
    ...ranked.slice(hashRotation % Math.max(ranked.length, 1)),
    ...ranked.slice(0, hashRotation % Math.max(ranked.length, 1)),
  ];

  const reserved = input.reservedUrls ?? new Set<string>();
  const reservedPhotoIds = input.reservedPhotoIds ?? new Set<string>();
  const tracker = input.featuredTracker ?? createFeaturedUsageTracker(SITE_IMAGE_MAX_REUSE);
  const picked: ScoredImageAsset[] = [];
  const usedUrls = new Set<string>();
  const usedIds = new Set<string>();

  const isBlocked = (asset: ScoredImageAsset) => {
    const normalized = normalizeImageUrl(asset.url);
    const identity = imageIdentityKey(asset.url);
    if (usedIds.has(asset.id) || usedUrls.has(normalized)) return true;
    if (reserved.has(normalized) || reservedPhotoIds.has(identity)) return true;
    if (!canUseFeaturedUrl(tracker, asset.url)) return true;
    return false;
  };

  for (const asset of rotated) {
    if (picked.length >= maxCount) break;
    if (isBlocked(asset)) continue;

    picked.push(asset);
    usedIds.add(asset.id);
    usedUrls.add(normalizeImageUrl(asset.url));
    reservedPhotoIds.add(imageIdentityKey(asset.url));
    markFeaturedUsed(tracker, asset.url);
  }

  for (const asset of rotated) {
    if (picked.length >= maxCount) break;
    if (usedIds.has(asset.id)) continue;
    const normalized = normalizeImageUrl(asset.url);
    if (usedUrls.has(normalized) || reserved.has(normalized)) continue;
    if (!canUseFeaturedUrl(tracker, asset.url)) continue;
    picked.push(asset);
    usedIds.add(asset.id);
    usedUrls.add(normalized);
    reservedPhotoIds.add(imageIdentityKey(asset.url));
    markFeaturedUsed(tracker, asset.url);
  }

  const imagePrompts = picked.slice(0, maxCount).map((asset, index) =>
    buildPromptFromAsset(asset, ctx, pickPlacement(index, asset.type), index)
  );

  const featured = pickFeaturedImage(imagePrompts, travelMode, tracker);
  if (featured) markFeaturedUsed(tracker, featured);

  if (input.reservedUrls) {
    for (const p of imagePrompts) {
      input.reservedUrls.add(normalizeImageUrl(p.url));
      input.reservedPhotoIds?.add(imageIdentityKey(p.url));
    }
    if (featured) {
      input.reservedUrls.add(normalizeImageUrl(featured));
      input.reservedPhotoIds?.add(imageIdentityKey(featured));
    }
  }

  const averageScore =
    imagePrompts.length > 0
      ? Math.round(
          imagePrompts.reduce((s, p) => s + (p.imageScore ?? 0), 0) / imagePrompts.length
        )
      : 0;

  return {
    featuredImage: featured || imagePrompts[0]?.url || optimizeImageUrl(pool[0]?.url ?? ""),
    imagePrompts,
    destinationKey: ctx.destinationKey,
    minRequired,
    averageScore,
  };
}

export function calculateBlogImageHealth(blog: {
  wordCount?: number;
  featuredImage?: string;
  imagePrompts?: BlogImagePrompt[];
}): number {
  const minRequired = minImagesForWordCount(blog.wordCount ?? 1200);
  const prompts = blog.imagePrompts?.filter((p) => p.url?.trim()) ?? [];
  let score = 100;

  if (!blog.featuredImage?.trim()) score -= 25;
  if (prompts.length < minRequired) score -= 20;
  if (prompts.length < 4) score -= 10;

  for (const p of prompts) {
    const alt = p.altText ?? p.alt ?? "";
    if (!alt.trim() || isBannedAltText(alt)) score -= 8;
    if (!p.caption?.trim()) score -= 4;
    if (!p.title?.trim()) score -= 3;
    if ((p.imageScore ?? 100) < RELEVANCE_THRESHOLD) score -= 5;
    if (!p.fileName?.trim()) score -= 2;
  }

  return Math.max(0, Math.min(100, score));
}

export function calculateEntityImageHealth(
  imageCount: number,
  minRequired: number,
  hasAlt = true
): number {
  let score = 100;
  if (imageCount < minRequired) score -= Math.min(40, (minRequired - imageCount) * 8);
  if (!hasAlt) score -= 15;
  if (imageCount === 0) score = 0;
  return Math.max(0, Math.min(100, score));
}
