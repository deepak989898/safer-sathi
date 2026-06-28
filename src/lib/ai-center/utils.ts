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

/** True when a non-rejected blog already exists for this keyword. */
export function keywordHasBlog(keyword: SeoKeyword, blogs: AiBlogPost[]): boolean {
  const normalized = keyword.keyword.toLowerCase().trim();
  const keywordSlug = slugify(keyword.keyword);
  return blogs.some((blog) => {
    if (blog.status === "rejected") return false;
    if (blog.keywordId && blog.keywordId === keyword.id) return true;
    if (blog.keyword.toLowerCase().trim() === normalized) return true;
    if (keywordSlug.length >= 4 && blog.slug.includes(keywordSlug)) return true;
    return false;
  });
}

export function approvedKeywordsWithoutBlog(
  keywords: SeoKeyword[],
  blogs: AiBlogPost[]
): SeoKeyword[] {
  return keywords.filter(
    (k) => k.status === "approved" && !keywordHasBlog(k, blogs)
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

  const needBlog = approvedKeywordsWithoutBlog(keywords, blogs);
  const approvedWithBlog = approved.length - needBlog.length;

  const blogDrafts = blogs.filter(
    (b) => b.status === "draft" || b.status === "pending_approval"
  );
  const readyToPublish = blogs.filter((b) => b.status === "approved");
  const published = blogs.filter((b) => b.status === "published");
  const blogsApproved = readyToPublish.length + published.length;

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
      total: blogsApproved + blogDrafts.length,
      percent: workflowPercent(blogsApproved, blogsApproved + blogDrafts.length),
      tabId: "drafts",
      status:
        blogsApproved + blogDrafts.length === 0
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
    },
  };
}
