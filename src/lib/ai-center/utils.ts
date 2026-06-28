import type { AiBlogPost, SeoKeyword, SeoMetaRecord } from "@/lib/ai-center/types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function computeSeoScore(input: {
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
}): number {
  const competitionScore =
    input.competition === "low" ? 90 : input.competition === "medium" ? 65 : 40;
  const volumeScore = Math.min(100, Math.round(input.searchVolume / 500));
  const trend = Math.min(100, input.trendScore);
  return Math.round(competitionScore * 0.4 + volumeScore * 0.35 + trend * 0.25);
}

export function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** All non-rejected blogs that belong to this keyword. */
export function blogsMatchingKeyword(
  keyword: SeoKeyword,
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): AiBlogPost[] {
  const normalized = keyword.keyword.toLowerCase().trim();
  const keywordSlug = slugify(keyword.keyword);
  const metaSlug = seoMeta
    .find((m) => m.keywordId === keyword.id)
    ?.slug?.toLowerCase();

  return blogs.filter((blog) => {
    if (blog.status === "rejected") return false;
    if (blog.keywordId && blog.keywordId === keyword.id) return true;
    if (blog.keyword.toLowerCase().trim() === normalized) return true;
    if (metaSlug && blog.slug.toLowerCase() === metaSlug) return true;
    if (keywordSlug.length >= 4 && blog.slug.toLowerCase() === keywordSlug) return true;
    return false;
  });
}

const BLOG_STATUS_RANK: Record<AiBlogPost["status"], number> = {
  published: 5,
  approved: 4,
  pending_approval: 3,
  draft: 2,
  rejected: 0,
};

/** Best blog to represent a keyword when duplicates exist (prefer published, then newest). */
export function pickCanonicalBlog(matches: AiBlogPost[]): AiBlogPost | undefined {
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => {
    const rankDiff = BLOG_STATUS_RANK[b.status] - BLOG_STATUS_RANK[a.status];
    if (rankDiff !== 0) return rankDiff;
    return (
      new Date(b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.createdAt).getTime()
    );
  })[0];
}

/** One canonical blog per approved keyword (ignores duplicate/orphan copies). */
export function buildCanonicalBlogMap(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): Map<string, AiBlogPost> {
  const map = new Map<string, AiBlogPost>();
  for (const keyword of keywords.filter((k) => k.status === "approved")) {
    const canonical = pickCanonicalBlog(blogsMatchingKeyword(keyword, blogs, seoMeta));
    if (canonical) map.set(keyword.id, canonical);
  }
  return map;
}

/** Slug that would be used for a keyword's blog post. */
export function getProposedKeywordSlug(
  keyword: SeoKeyword,
  seoMeta: SeoMetaRecord[] = []
): string {
  const meta = seoMeta.find((m) => m.keywordId === keyword.id);
  return (meta?.slug ?? slugify(keyword.keyword)).toLowerCase();
}

export function findActiveBlogBySlug(
  blogs: AiBlogPost[],
  slug: string
): AiBlogPost | undefined {
  const normalized = slug.toLowerCase();
  return blogs.find(
    (b) => b.status !== "rejected" && b.slug.toLowerCase() === normalized
  );
}

/** Extra copies that share the same /blog/slug URL (only one should be live). */
export function getSlugDuplicateBlogs(blogs: AiBlogPost[]): AiBlogPost[] {
  const groups = new Map<string, AiBlogPost[]>();

  for (const blog of blogs) {
    if (blog.status === "rejected") continue;
    const slug = blog.slug.toLowerCase();
    const list = groups.get(slug) ?? [];
    list.push(blog);
    groups.set(slug, list);
  }

  const duplicates: AiBlogPost[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const canonical = pickCanonicalBlog(group);
    if (!canonical) continue;
    duplicates.push(...group.filter((b) => b.id !== canonical.id));
  }
  return duplicates;
}

/** Keyword-level + slug-level duplicate copies (for cleanup UI). */
export function getAllDuplicateBlogs(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): AiBlogPost[] {
  const seen = new Set<string>();
  const merged: AiBlogPost[] = [];

  for (const blog of [
    ...getDuplicateBlogs(keywords, blogs, seoMeta),
    ...getSlugDuplicateBlogs(blogs),
  ]) {
    if (seen.has(blog.id)) continue;
    seen.add(blog.id);
    merged.push(blog);
  }
  return merged;
}

/** Blogs not linked to any approved keyword (leftover after keyword deletes / re-runs). */
export function getOrphanBlogs(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): AiBlogPost[] {
  const canonicalIds = new Set(
    [...buildCanonicalBlogMap(keywords, blogs, seoMeta).values()].map((b) => b.id)
  );

  return blogs.filter((blog) => {
    if (blog.status === "rejected" || canonicalIds.has(blog.id)) return false;
    const linked = keywords.some(
      (k) =>
        k.status === "approved" &&
        blogsMatchingKeyword(k, [blog], seoMeta).length > 0
    );
    return !linked;
  });
}

/** Extra blog copies linked to a keyword but not the canonical one. */
export function getDuplicateBlogs(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): AiBlogPost[] {
  const canonicalIds = new Set(
    [...buildCanonicalBlogMap(keywords, blogs, seoMeta).values()].map((b) => b.id)
  );

  return blogs.filter((blog) => {
    if (blog.status === "rejected" || canonicalIds.has(blog.id)) return false;
    return keywords.some(
      (k) =>
        k.status === "approved" &&
        blogsMatchingKeyword(k, [blog], seoMeta).length > 0
    );
  });
}

/** True when a non-rejected blog already exists for this keyword (or same URL slug). */
export function keywordHasBlog(
  keyword: SeoKeyword,
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): boolean {
  if (blogsMatchingKeyword(keyword, blogs, seoMeta).length > 0) return true;
  const slug = getProposedKeywordSlug(keyword, seoMeta);
  return Boolean(findActiveBlogBySlug(blogs, slug));
}

export function approvedKeywordsWithoutBlog(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[] = []
): SeoKeyword[] {
  return keywords.filter(
    (k) => k.status === "approved" && !keywordHasBlog(k, blogs, seoMeta)
  );
}

export type SeoWorkflowStageStatus = "complete" | "in_progress" | "waiting" | "empty";

export interface SeoPublishWorkflowStage {
  id: string;
  label: string;
  description: string;
  completed: number;
  remaining: number;
  total: number;
  percent: number;
  tabId?: string;
  status: SeoWorkflowStageStatus;
}

export interface SeoPublishWorkflowStats {
  stages: SeoPublishWorkflowStage[];
  overallCompleted: number;
  overallTotal: number;
  overallPercent: number;
  remainingToPublish: number;
  summary: {
    withSeoMeta: number;
    needBlog: number;
    blogDrafts: number;
    readyToPublish: number;
    published: number;
    duplicateBlogs: number;
    orphanBlogs: number;
    totalBlogDocuments: number;
  };
}

function workflowPercent(done: number, total: number): number {
  if (total <= 0) return done > 0 ? 100 : 0;
  return Math.round((done / total) * 100);
}

/** Counts for keyword → SEO meta → blog → publish pipeline. */
export function computeSeoPublishWorkflowStats(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[],
  seoMeta: SeoMetaRecord[]
): SeoPublishWorkflowStats {
  const pending = keywords.filter((k) => k.status === "pending");
  const approved = keywords.filter((k) => k.status === "approved");

  const approvedIds = new Set(approved.map((k) => k.id));
  const approvedWithMeta = seoMeta.filter((m) => approvedIds.has(m.keywordId)).length;
  const approvedMissingMeta = Math.max(0, approved.length - approvedWithMeta);

  const needBlog = approvedKeywordsWithoutBlog(keywords, blogs, seoMeta);
  const approvedWithBlog = approved.length - needBlog.length;

  const canonicalMap = buildCanonicalBlogMap(keywords, blogs, seoMeta);
  const canonicalBlogs = [...canonicalMap.values()];
  const duplicateBlogCount = getAllDuplicateBlogs(keywords, blogs, seoMeta).length;
  const orphanBlogCount = getOrphanBlogs(keywords, blogs, seoMeta).length;

  const blogDrafts = canonicalBlogs.filter(
    (b) => b.status === "draft" || b.status === "pending_approval"
  );
  const readyToPublish = canonicalBlogs.filter((b) => b.status === "approved");
  const published = canonicalBlogs.filter((b) => b.status === "published");
  const blogsApproved = readyToPublish.length + published.length;
  const blogsWithDraftStage = blogsApproved + blogDrafts.length;

  const approvalPool = pending.length + approved.length;

  const stages: SeoPublishWorkflowStage[] = [
    {
      id: "approve",
      label: "Keyword Research",
      description: "Review pending keyword ideas",
      completed: approved.length,
      remaining: pending.length,
      total: approvalPool,
      percent: workflowPercent(approved.length, approvalPool),
      tabId: "keywords",
      status:
        approvalPool === 0
          ? "empty"
          : pending.length === 0
            ? "complete"
            : "in_progress",
    },
    {
      id: "seo-meta",
      label: "SEO Meta",
      description: "Title, description, slug & schema",
      completed: approvedWithMeta,
      remaining: approvedMissingMeta,
      total: approved.length,
      percent: workflowPercent(approvedWithMeta, approved.length),
      tabId: "keywords",
      status:
        approved.length === 0
          ? "empty"
          : approvedMissingMeta === 0
            ? "complete"
            : "in_progress",
    },
    {
      id: "blog-draft",
      label: "AI Blog Writer",
      description: "AI articles for approved keywords",
      completed: approvedWithBlog,
      remaining: needBlog.length,
      total: approved.length,
      percent: workflowPercent(approvedWithBlog, approved.length),
      tabId: "blog-writer",
      status:
        approved.length === 0
          ? "empty"
          : needBlog.length === 0
            ? "complete"
            : "in_progress",
    },
    {
      id: "blog-approve",
      label: "Blog Drafts",
      description: "Drafts reviewed and ready to publish",
      completed: blogsApproved,
      remaining: blogDrafts.length,
      total: blogsWithDraftStage,
      percent: workflowPercent(blogsApproved, blogsWithDraftStage),
      tabId: "drafts",
      status:
        blogsWithDraftStage === 0
          ? "empty"
          : blogDrafts.length === 0
            ? "complete"
            : "in_progress",
    },
    {
      id: "publish",
      label: "Published",
      description: "Live on /blog for visitors & Google",
      completed: published.length,
      remaining: readyToPublish.length,
      total: approved.length,
      percent: workflowPercent(published.length, approved.length),
      tabId: "scheduled",
      status:
        approved.length === 0
          ? "empty"
          : published.length >= approved.length
            ? "complete"
            : published.length > 0 || readyToPublish.length > 0
              ? "in_progress"
              : "waiting",
    },
  ];

  const overallTotal = approved.length;
  const overallCompleted = published.length;

  return {
    stages,
    overallCompleted,
    overallTotal,
    overallPercent: workflowPercent(overallCompleted, overallTotal),
    remainingToPublish: Math.max(0, overallTotal - overallCompleted),
    summary: {
      withSeoMeta: approvedWithMeta,
      needBlog: needBlog.length,
      blogDrafts: blogDrafts.length,
      readyToPublish: readyToPublish.length,
      published: published.length,
      duplicateBlogs: duplicateBlogCount,
      orphanBlogs: orphanBlogCount,
      totalBlogDocuments: blogs.filter((b) => b.status !== "rejected").length,
    },
  };
}
