import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { generateCityKeywordResearch } from "@/lib/ai-center/city-keyword-research";
import { generateBlogPost, restructureBlogToTravelOutline } from "@/lib/ai-center/blog-writer-agent";
import { enrichBlogWithOpenAiFeaturedImage } from "@/lib/ai-center/ai-blog-image-generator";
import { hydrateImageGenerationLogs } from "@/lib/ai-center/image-generation-logs";
import { generateKeywordResearch } from "@/lib/ai-center/seo-keyword-agent";
import { generateSeoMetaForKeyword } from "@/lib/ai-center/seo-meta-generator";
import {
  checkTitlesAgainstBlogs,
  type TitleSimilarityResult,
} from "@/lib/ai-center/blog-title-similarity";
import { keywordHasBlog, blogsMatchingKeyword, buildCanonicalBlogMap, getAllDuplicateBlogs, getOrphanBlogs, getProposedKeywordSlug, findActiveBlogBySlug, pickCanonicalBlog, slugify } from "@/lib/ai-center/utils";
import {
  fetchFreeStockFeaturedImage,
  type FreeStockProvider,
} from "@/lib/media/free-stock-images";
import type {
  AiBlogPost,
  AiCenterLog,
  AiCenterSettings,
  AiLogType,
  BlogStatus,
  KeywordStatus,
  SeoKeyword,
  SeoMetaRecord,
} from "@/lib/ai-center/types";
import { DEFAULT_AI_CENTER_SETTINGS as DEFAULT_SETTINGS } from "@/lib/ai-center/types";

const COLLECTIONS = {
  keywords: "seo_keywords",
  seoMeta: "seo_meta",
  blogs: "blogs",
  logs: "ai_center_logs",
  settings: "ai_center_settings",
} as const;

let keywordCache: SeoKeyword[] = [];
let seoMetaCache: SeoMetaRecord[] = [];
let blogCache: AiBlogPost[] = [];
let logCache: AiCenterLog[] = [];
let settingsCache: AiCenterSettings = { ...DEFAULT_SETTINGS };
let hydratePromise: Promise<void> | null = null;
let hydratedAt = 0;
const HYDRATE_TTL_MS = 10 * 60 * 1000;
/** Avoid repeat Firestore work for deleted / never-published blog slugs. */
const blogSlugMissCache = new Map<string, number>();
const BLOG_MISS_TTL_MS = 30 * 60 * 1000;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function persistDoc(collection: string, id: string, data: object): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).set(sanitize(data));
  } catch (error) {
    console.warn(`Firebase persist ${collection}/${id} failed:`, error);
  }
}

async function deleteDoc(collection: string, id: string): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).delete();
  } catch (error) {
    console.warn(`Firebase delete ${collection}/${id} failed:`, error);
  }
}

async function batchDeleteDocs(collection: string, ids: string[]): Promise<void> {
  if (!ids.length || !isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;

  const BATCH_SIZE = 450;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const id of chunk) {
      batch.delete(db.collection(collection).doc(id));
    }
    await batch.commit();
  }
}

async function loadAll<T extends { id: string; createdAt?: string }>(
  collection: string,
  limit = 300
): Promise<T[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    let snap;
    try {
      snap = await db
        .collection(collection)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    } catch {
      snap = await db.collection(collection).limit(limit).get();
    }
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as T)
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
  } catch (error) {
    console.warn(`Firebase load ${collection} failed:`, error);
    return [];
  }
}

function mergeCache<T extends { id: string }>(cache: T[], item: T): T[] {
  const idx = cache.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const next = [...cache];
    next[idx] = item;
    return next;
  }
  return [item, ...cache];
}

async function loadSettings(): Promise<AiCenterSettings> {
  const fallback: AiCenterSettings = { ...DEFAULT_SETTINGS, id: "global" };
  if (!isAdminEnvConfigured()) return fallback;

  try {
    const db = await getSafeAdminDb();
    if (!db) return fallback;
    const doc = await db.collection(COLLECTIONS.settings).doc("global").get();
    if (doc.exists) {
      return { ...DEFAULT_SETTINGS, ...doc.data(), id: "global" } as AiCenterSettings;
    }
  } catch (error) {
    console.warn("loadSettings failed:", error);
  }

  return fallback;
}

export async function hydrateAiCenterStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  if (Date.now() - hydratedAt < HYDRATE_TTL_MS && blogCache.length > 0) return;

  hydratePromise = (async () => {
    const [keywords, meta, blogs, logs, settings] = await Promise.all([
      loadAll<SeoKeyword>(COLLECTIONS.keywords, 5000),
      loadAll<SeoMetaRecord>(COLLECTIONS.seoMeta, 5000),
      loadAll<AiBlogPost>(COLLECTIONS.blogs, 5000),
      loadAll<AiCenterLog>(COLLECTIONS.logs, 500),
      loadSettings(),
    ]);
    keywordCache = keywords;
    seoMetaCache = meta;
    if (blogs.length) blogCache = blogs;
    if (logs.length) logCache = logs;
    settingsCache = settings;
    await hydrateImageGenerationLogs();
    hydratedAt = Date.now();
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

export async function addAiCenterLog(input: {
  type: AiLogType;
  message: string;
  resourceId?: string;
  resourceType?: AiCenterLog["resourceType"];
  durationMs?: number;
  error?: string;
}): Promise<AiCenterLog> {
  const log: AiCenterLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  logCache = [log, ...logCache].slice(0, 500);
  await persistDoc(COLLECTIONS.logs, log.id, log);
  return log;
}

export function getAiCenterSettings(): AiCenterSettings {
  return { ...DEFAULT_SETTINGS, ...settingsCache };
}

export async function updateAiCenterSettings(
  updates: Partial<AiCenterSettings>,
  updatedBy?: string
): Promise<AiCenterSettings> {
  settingsCache = {
    ...settingsCache,
    ...updates,
    id: "global",
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await persistDoc(COLLECTIONS.settings, "global", settingsCache);
  return settingsCache;
}

export function listKeywords(status?: KeywordStatus): SeoKeyword[] {
  if (!status) return [...keywordCache];
  return keywordCache.filter((k) => k.status === status);
}

export function listSeoMeta(): SeoMetaRecord[] {
  return [...seoMetaCache];
}

export function listBlogs(status?: BlogStatus): AiBlogPost[] {
  if (!status) return [...blogCache];
  return blogCache.filter((b) => b.status === status);
}

export function listAiLogs(limit = 100): AiCenterLog[] {
  return [...logCache]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

export {
  getImageGenerationStats,
  hydrateImageGenerationLogs,
  listImageGenerationLogs,
} from "@/lib/ai-center/image-generation-logs";

export function getBlogById(id: string): AiBlogPost | null {
  return blogCache.find((b) => b.id === id) ?? null;
}

export function getPublishedBlogs(): AiBlogPost[] {
  return blogCache.filter((b) => b.status === "published");
}

export function getBlogBySlug(slug: string): AiBlogPost | null {
  const normalized = slug.trim().toLowerCase();
  return (
    blogCache.find(
      (b) => b.slug.toLowerCase() === normalized && b.status === "published"
    ) ?? null
  );
}

/** Direct Firestore lookup — reliable on serverless when in-memory cache is cold. */
export async function fetchPublishedBlogBySlug(slug: string): Promise<AiBlogPost | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const cached = blogCache.find(
    (b) => b.slug.toLowerCase() === normalized && b.status === "published"
  );
  if (cached) return cached;

  const missAt = blogSlugMissCache.get(normalized);
  if (missAt && Date.now() - missAt < BLOG_MISS_TTL_MS) {
    return null;
  }

  if (!isAdminEnvConfigured()) {
    // Demo / local only — never full-scan on public misses.
    return getBlogBySlug(normalized);
  }

  try {
    const db = await getSafeAdminDb();
    if (!db) {
      return getBlogBySlug(normalized);
    }

    const snap = await db
      .collection(COLLECTIONS.blogs)
      .where("slug", "==", normalized)
      .limit(5)
      .get();

    const published = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as AiBlogPost)
      .find((b) => b.status === "published");

    if (published) {
      blogSlugMissCache.delete(normalized);
      blogCache = mergeCache(blogCache, published);
      return published;
    }

    blogSlugMissCache.set(normalized, Date.now());
    return null;
  } catch (error) {
    console.warn("fetchPublishedBlogBySlug failed:", error);
    return getBlogBySlug(normalized);
  }
}

export async function runKeywordGeneration(actorId?: string): Promise<{
  added: SeoKeyword[];
  duplicatesSkipped: number;
  poolExhausted: boolean;
  googleSuggestCount: number;
  googleSerpCount: number;
}> {
  const start = Date.now();
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  const limit = settings.keywordsPerDay;
  const existingKeywords = keywordCache.map((k) => k.keyword);

  try {
    const { keywords: generated, poolSize, googleSuggestCount, googleSerpCount } =
      await generateKeywordResearch(limit, existingKeywords);
    const existing = new Set(existingKeywords.map((k) => k.toLowerCase()));
    const fresh = generated.filter((k) => !existing.has(k.keyword.toLowerCase()));
    const duplicatesSkipped = generated.length - fresh.length;

    for (const kw of fresh) {
      keywordCache = mergeCache(keywordCache, kw);
      await persistDoc(COLLECTIONS.keywords, kw.id, kw);
    }

    await addAiCenterLog({
      type: "keyword_generated",
      message:
        fresh.length > 0
          ? `Added ${fresh.length} new keywords (${googleSuggestCount} from Google suggest${googleSerpCount ? `, ${googleSerpCount} from SerpAPI` : ""})`
          : `No new keywords — ${existingKeywords.length} already saved, ${poolSize} ideas in pool`,
      durationMs: Date.now() - start,
    });

    if (settings.autoDraftEnabled) {
      for (const kw of fresh.filter((k) => k.status === "pending").slice(0, 2)) {
        await approveKeyword(kw.id, actorId ?? "system", true);
      }
    }

    return {
      added: fresh,
      duplicatesSkipped,
      poolExhausted: fresh.length === 0 && poolSize === 0,
      googleSuggestCount,
      googleSerpCount,
    };
  } catch (error) {
    await addAiCenterLog({
      type: "error",
      message: "Keyword generation failed",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
    });
    throw error;
  }
}

export async function previewCityKeywordResearch(
  city: string,
  limit = 100
): Promise<Awaited<ReturnType<typeof generateCityKeywordResearch>>> {
  await hydrateAiCenterStore();
  const existingKeywords = keywordCache.map((k) => k.keyword);
  return generateCityKeywordResearch(city, limit, existingKeywords);
}

export async function saveCityKeywords(
  city: string,
  keywordRecords: SeoKeyword[],
  actorId?: string,
  autoApprove = false
): Promise<{ added: SeoKeyword[]; approved: SeoKeyword[]; duplicatesSkipped: number }> {
  const start = Date.now();
  await hydrateAiCenterStore();
  const existing = new Set(keywordCache.map((k) => k.keyword.toLowerCase()));
  const existingSlugs = new Set([
    ...blogCache
      .filter((b) => b.status !== "rejected")
      .map((b) => b.slug.toLowerCase()),
    ...seoMetaCache.map((m) => m.slug.toLowerCase()),
  ]);
  const added: SeoKeyword[] = [];
  let duplicatesSkipped = 0;

  for (const kw of keywordRecords) {
    const key = kw.keyword.toLowerCase().trim();
    const slug = slugify(kw.keyword);
    if (!key || existing.has(key) || existingSlugs.has(slug)) {
      duplicatesSkipped += 1;
      continue;
    }
    existing.add(key);
    existingSlugs.add(slug);
    const record: SeoKeyword = {
      ...kw,
      status: "pending",
      createdAt: kw.createdAt || new Date().toISOString(),
    };
    keywordCache = mergeCache(keywordCache, record);
    await persistDoc(COLLECTIONS.keywords, record.id, record);
    added.push(record);
  }

  await addAiCenterLog({
    type: "keyword_generated",
    message: `City research (${city}): saved ${added.length} keyword${added.length === 1 ? "" : "s"}`,
    durationMs: Date.now() - start,
  });

  const approved: SeoKeyword[] = [];
  if (autoApprove) {
    for (const kw of added) {
      const result = await approveKeyword(kw.id, actorId ?? "system");
      approved.push(result.keyword);
    }
  }

  return { added, approved, duplicatesSkipped };
}

export async function approveKeyword(
  id: string,
  approvedBy: string,
  skipBlog = false
): Promise<{
  keyword: SeoKeyword;
  seoMeta: SeoMetaRecord;
  blogCreated?: boolean;
  blogError?: string;
}> {
  const start = Date.now();
  const keyword = keywordCache.find((k) => k.id === id);
  if (!keyword) throw new Error("Keyword not found");

  const updated: SeoKeyword = {
    ...keyword,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };
  keywordCache = mergeCache(keywordCache, updated);
  await persistDoc(COLLECTIONS.keywords, updated.id, updated);

  const seoMeta = await generateSeoMetaForKeyword(updated);
  seoMetaCache = mergeCache(seoMetaCache, seoMeta);
  await persistDoc(COLLECTIONS.seoMeta, seoMeta.id, seoMeta);

  await addAiCenterLog({
    type: "keyword_approved",
    message: `Approved keyword: ${updated.keyword}`,
    resourceId: updated.id,
    resourceType: "keyword",
    durationMs: Date.now() - start,
  });
  await addAiCenterLog({
    type: "seo_meta_generated",
    message: `SEO meta for: ${updated.keyword}`,
    resourceId: seoMeta.id,
    resourceType: "seo_meta",
  });

  const settings = getAiCenterSettings();
  let blogCreated = false;
  let blogError: string | undefined;

  if (!skipBlog) {
    const proposedSlug = getProposedKeywordSlug(updated, seoMetaCache);
    const existingBySlug = findActiveBlogBySlug(blogCache, proposedSlug);
    if (existingBySlug) {
      blogError = `Skipped — /blog/${proposedSlug} already exists`;
    } else {
      try {
        await generateBlogFromKeyword(updated.id, approvedBy, {
          generateAiImage:
            settings.openAiImagesEnabled && settings.openAiImagesDefaultToggle,
        });
        blogCreated = true;
      } catch (error) {
        blogError = error instanceof Error ? error.message : "Blog generation failed";
        await addAiCenterLog({
          type: "error",
          message: `Blog draft failed for: ${updated.keyword}`,
          resourceId: updated.id,
          resourceType: "keyword",
          error: blogError,
        });
      }
    }
  }

  return { keyword: updated, seoMeta, blogCreated, blogError };
}

export async function rejectKeyword(id: string, reason?: string): Promise<SeoKeyword> {
  const keyword = keywordCache.find((k) => k.id === id);
  if (!keyword) throw new Error("Keyword not found");
  const updated: SeoKeyword = {
    ...keyword,
    status: "rejected",
    updatedAt: new Date().toISOString(),
  };
  keywordCache = mergeCache(keywordCache, updated);
  await persistDoc(COLLECTIONS.keywords, updated.id, updated);
  await addAiCenterLog({
    type: "keyword_rejected",
    message: reason ?? `Rejected keyword: ${updated.keyword}`,
    resourceId: updated.id,
    resourceType: "keyword",
  });
  return updated;
}

export async function deleteKeyword(id: string): Promise<void> {
  keywordCache = keywordCache.filter((k) => k.id !== id);
  await deleteDoc(COLLECTIONS.keywords, id);
}

export async function generateBlogFromKeyword(
  keywordId: string,
  actorId?: string,
  options?: { generateAiImage?: boolean }
): Promise<{ blog: AiBlogPost; imageGenerationMessage?: string }> {
  const start = Date.now();
  await hydrateAiCenterStore();
  const keyword = keywordCache.find((k) => k.id === keywordId);
  if (!keyword) throw new Error("Keyword not found");
  if (keyword.status !== "approved") throw new Error("Keyword must be approved first");

  if (keywordHasBlog(keyword, blogCache, seoMetaCache)) {
    const existing = blogsMatchingKeyword(keyword, blogCache, seoMetaCache)[0];
    throw new Error(
      `A blog already exists for this keyword (${existing?.status ?? "existing"}: ${existing?.title ?? keyword.keyword})`
    );
  }

  const seoMeta = seoMetaCache.find((m) => m.keywordId === keywordId);
  const proposedSlug = getProposedKeywordSlug(keyword, seoMetaCache);
  const slugCollision = findActiveBlogBySlug(blogCache, proposedSlug);
  if (slugCollision) {
    throw new Error(
      `A blog with URL /blog/${proposedSlug} already exists (${slugCollision.title})`
    );
  }

  const settings = getAiCenterSettings();
  const blog = await generateBlogPost({ keyword, seoMeta, settings });
  blog.status = "pending_approval";

  blogCache = mergeCache(blogCache, blog);
  await persistDoc(COLLECTIONS.blogs, blog.id, blog);

  await addAiCenterLog({
    type: "blog_generated",
    message: `Blog draft: ${blog.title}`,
    resourceId: blog.id,
    resourceType: "blog",
    durationMs: Date.now() - start,
  });

  let finalBlog = blog;
  let imageGenerationMessage: string | undefined;

  const shouldGenerateImage =
    options?.generateAiImage === true && settings.openAiImagesEnabled;

  if (shouldGenerateImage) {
    const enrichment = await enrichBlogWithOpenAiFeaturedImage(
      blog,
      settings,
      actorId ?? "system"
    );
    if (enrichment.success && enrichment.blog) {
      finalBlog = enrichment.blog;
      blogCache = mergeCache(blogCache, finalBlog);
      await persistDoc(COLLECTIONS.blogs, finalBlog.id, finalBlog);
      await addAiCenterLog({
        type: "blog_image_generated",
        message: `OpenAI featured image: ${finalBlog.title}`,
        resourceId: finalBlog.id,
        resourceType: "blog",
      });
    } else if (enrichment.message) {
      imageGenerationMessage = enrichment.message;
    }
  }

  if (settings.autoPublishEnabled && !settings.approvalRequired) {
    const published = await publishBlog(finalBlog.id, actorId ?? "system");
    return { blog: published, imageGenerationMessage };
  }

  return { blog: finalBlog, imageGenerationMessage };
}

export type ManualBlogImageMode = FreeStockProvider | "ai";

export async function checkManualTitleSimilarity(
  titles: string[]
): Promise<TitleSimilarityResult[]> {
  await hydrateAiCenterStore();
  const cleaned = titles
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter((t) => t.length >= 8);
  return checkTitlesAgainstBlogs(cleaned, blogCache);
}

function uniqueManualSlug(baseSlug: string): string {
  let slug = baseSlug || `manual-blog-${Date.now()}`;
  if (!findActiveBlogBySlug(blogCache, slug)) return slug;
  for (let i = 2; i < 50; i += 1) {
    const candidate = `${baseSlug}-${i}`;
    if (!findActiveBlogBySlug(blogCache, candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Generate + auto-publish a blog from a manual admin title.
 * Image: catalog / Unsplash / Pexels stock, or OpenAI when imageMode === "ai".
 */
export async function generateBlogFromManualTitle(
  title: string,
  actorId: string,
  options: { imageMode: ManualBlogImageMode; forcePublish?: boolean }
): Promise<{ blog: AiBlogPost; imageGenerationMessage?: string; similarity?: TitleSimilarityResult }> {
  const start = Date.now();
  await hydrateAiCenterStore();

  const cleanTitle = title.trim().replace(/\s+/g, " ");
  if (cleanTitle.length < 8) throw new Error("Title must be at least 8 characters");

  const similarity = checkTitlesAgainstBlogs([cleanTitle], blogCache)[0];
  const baseSlug = slugify(cleanTitle);
  const slug = uniqueManualSlug(baseSlug);

  const now = new Date().toISOString();
  const syntheticKeyword: SeoKeyword = {
    id: `manual_kw_${slug}_${Date.now()}`,
    keyword: cleanTitle,
    searchVolume: 500,
    competition: "medium",
    trendScore: 50,
    category: "travel_guides",
    destination: undefined,
    seoScore: 70,
    status: "approved",
    source: "ai",
    createdAt: now,
    approvedAt: now,
    approvedBy: actorId,
  };

  const settings = getAiCenterSettings();
  const seoMeta: SeoMetaRecord = {
    id: `meta_${syntheticKeyword.id}`,
    keywordId: syntheticKeyword.id,
    keyword: cleanTitle,
    seoTitle: cleanTitle.slice(0, 60),
    seoDescription: `Plan ${cleanTitle} with Safar Sathi — guides, packages, and booking tips.`,
    focusKeyword: cleanTitle,
    slug,
    faq: [],
    metaKeywords: cleanTitle.split(/\s+/).slice(0, 8),
    openGraph: {
      title: cleanTitle,
      description: `Plan ${cleanTitle} with Safar Sathi.`,
      url: `/blog/${slug}`,
    },
    schemaMarkup: {},
    canonicalUrl: `/blog/${slug}`,
    createdAt: now,
  };

  const blog = await generateBlogPost({
    keyword: syntheticKeyword,
    seoMeta,
    settings,
    titleOverride: cleanTitle,
  });
  blog.status = "pending_approval";
  blog.slug = slug;

  blogCache = mergeCache(blogCache, blog);
  await persistDoc(COLLECTIONS.blogs, blog.id, blog);

  await addAiCenterLog({
    type: "blog_generated",
    message: `Manual title blog: ${blog.title}`,
    resourceId: blog.id,
    resourceType: "blog",
    durationMs: Date.now() - start,
  });

  let finalBlog = blog;
  let imageGenerationMessage: string | undefined;
  const imageMode = options.imageMode;

  if (imageMode === "ai") {
    if (!settings.openAiImagesEnabled) {
      imageGenerationMessage =
        "AI images are disabled in settings — using catalog stock image instead.";
    } else {
      const enrichment = await enrichBlogWithOpenAiFeaturedImage(
        blog,
        settings,
        actorId
      );
      if (enrichment.success && enrichment.blog) {
        finalBlog = enrichment.blog;
        blogCache = mergeCache(blogCache, finalBlog);
        await persistDoc(COLLECTIONS.blogs, finalBlog.id, finalBlog);
        await addAiCenterLog({
          type: "blog_image_generated",
          message: `OpenAI featured image (manual title): ${finalBlog.title}`,
          resourceId: finalBlog.id,
          resourceType: "blog",
        });
      } else if (enrichment.message) {
        imageGenerationMessage = enrichment.message;
      }
    }
  } else if (imageMode === "unsplash" || imageMode === "pexels") {
    const stock = await fetchFreeStockFeaturedImage({
      provider: imageMode,
      query: cleanTitle,
    });
    finalBlog = {
      ...finalBlog,
      featuredImage: stock.url,
      imageSource: "manual",
      imageGenerated: false,
      updatedAt: new Date().toISOString(),
      imagePrompts: finalBlog.imagePrompts.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              url: stock.url,
              alt: stock.alt ?? cleanTitle,
              caption: stock.photographer
                ? `Photo: ${stock.photographer} (${stock.provider})`
                : p.caption,
            }
          : p
      ),
    };
    blogCache = mergeCache(blogCache, finalBlog);
    await persistDoc(COLLECTIONS.blogs, finalBlog.id, finalBlog);
  }
  // catalog: keep assignBlogImages result from generateBlogPost

  const shouldPublish = options.forcePublish !== false;
  if (shouldPublish) {
    const approved: AiBlogPost = {
      ...finalBlog,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: actorId,
      updatedAt: new Date().toISOString(),
    };
    blogCache = mergeCache(blogCache, approved);
    await persistDoc(COLLECTIONS.blogs, approved.id, approved);
    const published = await publishBlog(approved.id, actorId);
    return { blog: published, imageGenerationMessage, similarity };
  }

  return { blog: finalBlog, imageGenerationMessage, similarity };
}

export async function updateBlog(
  id: string,
  updates: Partial<AiBlogPost>
): Promise<AiBlogPost> {
  const blog = blogCache.find((b) => b.id === id);
  if (!blog) throw new Error("Blog not found");
  const updated: AiBlogPost = {
    ...blog,
    ...updates,
    id: blog.id,
    updatedAt: new Date().toISOString(),
  };
  blogCache = mergeCache(blogCache, updated);
  await persistDoc(COLLECTIONS.blogs, updated.id, updated);

  if (updated.status === "published") {
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/blog");
      revalidatePath(`/blog/${updated.slug}`);
    } catch {
      // no-op outside Next request context
    }
  }

  return updated;
}

export async function approveBlog(id: string, approvedBy: string): Promise<AiBlogPost> {
  const blog = blogCache.find((b) => b.id === id);
  if (!blog) throw new Error("Blog not found");

  if (blog.keywordId) {
    const keyword = keywordCache.find((k) => k.id === blog.keywordId);
    if (keyword) {
      const canonical = buildCanonicalBlogMap(keywordCache, blogCache, seoMetaCache).get(
        keyword.id
      );
      if (canonical && canonical.id !== blog.id) {
        throw new Error(
          `Duplicate blog — use the canonical copy: ${canonical.title} (${canonical.status})`
        );
      }
    }
  }

  const updated: AiBlogPost = {
    ...blog,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };
  blogCache = mergeCache(blogCache, updated);
  await persistDoc(COLLECTIONS.blogs, updated.id, updated);
  await addAiCenterLog({
    type: "blog_approved",
    message: `Approved blog: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "blog",
  });

  const settings = getAiCenterSettings();
  if (settings.autoPublishEnabled) {
    return publishBlog(id, approvedBy);
  }
  return updated;
}

export async function rejectBlog(id: string, reason?: string): Promise<AiBlogPost> {
  const blog = blogCache.find((b) => b.id === id);
  if (!blog) throw new Error("Blog not found");
  const updated: AiBlogPost = {
    ...blog,
    status: "rejected",
    rejectedReason: reason,
    updatedAt: new Date().toISOString(),
  };
  blogCache = mergeCache(blogCache, updated);
  await persistDoc(COLLECTIONS.blogs, updated.id, updated);
  await addAiCenterLog({
    type: "blog_rejected",
    message: reason ?? `Rejected blog: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "blog",
  });
  return updated;
}

export async function publishBlog(id: string, approvedBy: string): Promise<AiBlogPost> {
  const settings = getAiCenterSettings();
  const blog = blogCache.find((b) => b.id === id);
  if (!blog) throw new Error("Blog not found");
  if (settings.approvalRequired && blog.status !== "approved") {
    throw new Error("Blog must be approved before publishing");
  }

  if (blog.keywordId) {
    const keyword = keywordCache.find((k) => k.id === blog.keywordId);
    if (keyword) {
      const canonical = buildCanonicalBlogMap(keywordCache, blogCache, seoMetaCache).get(
        keyword.id
      );
      if (canonical && canonical.id !== blog.id) {
        throw new Error(
          `Duplicate blog — publish the canonical copy instead: ${canonical.title}`
        );
      }
      const alreadyPublished = blogsMatchingKeyword(keyword, blogCache, seoMetaCache).filter(
        (b) => b.id !== blog.id && b.status === "published"
      );
      if (alreadyPublished.length > 0) {
        throw new Error(
          `This keyword already has a published blog: ${alreadyPublished[0].title}`
        );
      }
    }
  }

  const slugPublished = blogCache.filter(
    (b) => b.id !== blog.id && b.slug === blog.slug && b.status === "published"
  );
  if (slugPublished.length > 0) {
    throw new Error(`Slug "${blog.slug}" is already published on another post`);
  }

  const now = new Date().toISOString();
  const updated: AiBlogPost = {
    ...blog,
    status: "published",
    publishedAt: now,
    approvedBy: blog.approvedBy ?? approvedBy,
    updatedAt: now,
  };
  blogCache = mergeCache(blogCache, updated);
  await persistDoc(COLLECTIONS.blogs, updated.id, updated);
  await addAiCenterLog({
    type: "blog_published",
    message: `Published: ${updated.title}`,
    resourceId: updated.id,
    resourceType: "blog",
  });

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/blog");
    revalidatePath(`/blog/${updated.slug}`);
  } catch {
    // no-op outside Next request context
  }

  return updated;
}

export async function deleteBlog(id: string): Promise<void> {
  const blog = blogCache.find((b) => b.id === id);
  blogCache = blogCache.filter((b) => b.id !== id);
  await deleteDoc(COLLECTIONS.blogs, id);
  if (blog) {
    await addAiCenterLog({
      type: "blog_deleted",
      message: `Deleted blog: ${blog.title}`,
      resourceId: id,
      resourceType: "blog",
    });
  }
}

/** Permanently remove duplicate blog copies; keeps one canonical blog per approved keyword. */
export async function deleteDuplicateBlogs(actorId?: string): Promise<{
  deleted: number;
  kept: number;
  deletedIds: string[];
}> {
  await hydrateAiCenterStore();

  const canonicalMap = buildCanonicalBlogMap(keywordCache, blogCache, seoMetaCache);
  const canonicalIds = new Set([...canonicalMap.values()].map((b) => b.id));

  const slugKeepIds = new Set<string>();
  const slugGroups = new Map<string, AiBlogPost[]>();
  for (const blog of blogCache) {
    if (blog.status === "rejected") continue;
    const slug = blog.slug.toLowerCase();
    const list = slugGroups.get(slug) ?? [];
    list.push(blog);
    slugGroups.set(slug, list);
  }
  for (const group of slugGroups.values()) {
    const canonical = group.length === 1 ? group[0] : pickCanonicalBlog(group);
    if (canonical) slugKeepIds.add(canonical.id);
  }

  const keepIds = new Set([...canonicalIds, ...slugKeepIds]);
  const duplicates = getAllDuplicateBlogs(keywordCache, blogCache, seoMetaCache).filter(
    (blog) => !keepIds.has(blog.id)
  );
  const orphans = getOrphanBlogs(keywordCache, blogCache, seoMetaCache).filter(
    (blog) => !keepIds.has(blog.id)
  );
  const toDelete = [...duplicates, ...orphans].filter(
    (blog, index, list) => list.findIndex((b) => b.id === blog.id) === index
  );

  if (toDelete.length === 0) {
    return { deleted: 0, kept: keepIds.size, deletedIds: [] };
  }

  const deletedIds: string[] = toDelete.map((blog) => blog.id);
  blogCache = blogCache.filter((b) => !deletedIds.includes(b.id));
  await batchDeleteDocs(COLLECTIONS.blogs, deletedIds);

  await addAiCenterLog({
    type: "blog_deleted",
    message: `Cleaned up ${toDelete.length} duplicate/orphan blog copies (${keepIds.size} kept)`,
    resourceType: "blog",
    resourceId: actorId,
  });

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/blog");
  } catch {
    // no-op outside Next request context
  }

  return { deleted: toDelete.length, kept: keepIds.size, deletedIds };
}

/**
 * Apply canonical travel outline to existing blogs (rule-based, fast).
 * Processes up to `limit` blogs that are missing the nested structure.
 */
export async function restructureBlogsToTravelOutline(options?: {
  limit?: number;
  onlyMissing?: boolean;
  status?: BlogStatus;
}): Promise<{
  updated: number;
  skipped: number;
  remaining: number;
  updatedIds: string[];
}> {
  const { hasStructuredTravelOutline } = await import(
    "@/lib/ai-center/blog-travel-outline"
  );
  await hydrateAiCenterStore();
  const settings = getAiCenterSettings();
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 50);
  const onlyMissing = options?.onlyMissing !== false;

  let candidates = blogCache.filter((b) => b.status !== "rejected");
  if (options?.status) {
    candidates = candidates.filter((b) => b.status === options.status);
  }
  if (onlyMissing) {
    candidates = candidates.filter((b) => !hasStructuredTravelOutline(b.content));
  }

  const batch = candidates.slice(0, limit);
  const updatedIds: string[] = [];

  for (const blog of batch) {
    const next = restructureBlogToTravelOutline(blog, settings);
    blogCache = mergeCache(blogCache, next);
    await persistDoc(COLLECTIONS.blogs, next.id, next);
    updatedIds.push(next.id);

    if (next.status === "published") {
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/blog");
        revalidatePath(`/blog/${next.slug}`);
      } catch {
        // no-op
      }
    }
  }

  if (updatedIds.length > 0) {
    await addAiCenterLog({
      type: "blog_generated",
      message: `Restructured ${updatedIds.length} blog(s) to travel outline (How to Reach / Stay / Do / Cost)`,
      resourceType: "blog",
    });
  }

  const remaining = Math.max(0, candidates.length - batch.length);
  return {
    updated: updatedIds.length,
    skipped: 0,
    remaining,
    updatedIds,
  };
}

export async function getAiCenterStats() {
  await hydrateAiCenterStore();
  const canonicalMap = buildCanonicalBlogMap(keywordCache, blogCache, seoMetaCache);
  const canonical = [...canonicalMap.values()];
  const approved = keywordCache.filter((k) => k.status === "approved");

  return {
    keywordsTotal: keywordCache.length,
    keywordsPending: keywordCache.filter((k) => k.status === "pending").length,
    keywordsApproved: approved.length,
    blogsDraft: canonical.filter((b) => b.status === "draft").length,
    blogsPending: canonical.filter((b) => b.status === "pending_approval").length,
    blogsPublished: canonical.filter((b) => b.status === "published").length,
    blogsPublishedDocuments: blogCache.filter((b) => b.status === "published").length,
    blogsRejected: blogCache.filter((b) => b.status === "rejected").length,
    blogsDuplicate: blogCache.filter((b) => b.status !== "rejected").length - canonical.length,
    seoMetaCount: seoMetaCache.length,
    approvedWithoutPublished: approved.length - canonical.filter((b) => b.status === "published").length,
    lastLog: logCache[0] ?? null,
  };
}

export type { AiBlogPost, SeoKeyword, SeoMetaRecord, AiCenterLog, AiCenterSettings };
