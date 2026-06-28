import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { generateCityKeywordResearch } from "@/lib/ai-center/city-keyword-research";
import { generateBlogPost } from "@/lib/ai-center/blog-writer-agent";
import { enrichBlogWithOpenAiFeaturedImage } from "@/lib/ai-center/ai-blog-image-generator";
import { hydrateImageGenerationLogs } from "@/lib/ai-center/image-generation-logs";
import { generateKeywordResearch } from "@/lib/ai-center/seo-keyword-agent";
import { generateSeoMetaForKeyword } from "@/lib/ai-center/seo-meta-generator";
import { keywordHasBlog } from "@/lib/ai-center/utils";
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

export async function hydrateAiCenterStore(): Promise<void> {
  const [keywords, meta, blogs, logs, settings] = await Promise.all([
    loadAll<SeoKeyword>(COLLECTIONS.keywords),
    loadAll<SeoMetaRecord>(COLLECTIONS.seoMeta),
    loadAll<AiBlogPost>(COLLECTIONS.blogs, 2000),
    loadAll<AiCenterLog>(COLLECTIONS.logs, 500),
    loadAll<AiCenterSettings>(COLLECTIONS.settings, 1),
  ]);
  if (keywords.length) keywordCache = keywords;
  if (meta.length) seoMetaCache = meta;
  if (blogs.length) blogCache = blogs;
  if (logs.length) logCache = logs;
  if (settings[0]) settingsCache = { ...DEFAULT_SETTINGS, ...settings[0] };
  await hydrateImageGenerationLogs();
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
  return logCache.slice(0, limit);
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

  if (!isAdminEnvConfigured()) {
    await hydrateAiCenterStore();
    return getBlogBySlug(normalized);
  }

  try {
    const db = await getSafeAdminDb();
    if (!db) {
      await hydrateAiCenterStore();
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
      blogCache = mergeCache(blogCache, published);
      return published;
    }

    await hydrateAiCenterStore();
    return getBlogBySlug(normalized);
  } catch (error) {
    console.warn("fetchPublishedBlogBySlug failed:", error);
    await hydrateAiCenterStore();
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
  const added: SeoKeyword[] = [];
  let duplicatesSkipped = 0;

  for (const kw of keywordRecords) {
    const key = kw.keyword.toLowerCase().trim();
    if (!key || existing.has(key)) {
      duplicatesSkipped += 1;
      continue;
    }
    existing.add(key);
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
    throw new Error("A blog draft already exists for this keyword");
  }

  const seoMeta = seoMetaCache.find((m) => m.keywordId === keywordId);
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

export async function getAiCenterStats() {
  await hydrateAiCenterStore();
  return {
    keywordsTotal: keywordCache.length,
    keywordsPending: keywordCache.filter((k) => k.status === "pending").length,
    keywordsApproved: keywordCache.filter((k) => k.status === "approved").length,
    blogsDraft: blogCache.filter((b) => b.status === "draft").length,
    blogsPending: blogCache.filter((b) => b.status === "pending_approval").length,
    blogsPublished: blogCache.filter((b) => b.status === "published").length,
    blogsRejected: blogCache.filter((b) => b.status === "rejected").length,
    seoMetaCount: seoMetaCache.length,
    lastLog: logCache[0] ?? null,
  };
}

export type { AiBlogPost, SeoKeyword, SeoMetaRecord, AiCenterLog, AiCenterSettings };
