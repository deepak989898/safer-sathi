import type { AiBlogPost } from "@/lib/ai-center/types";
import { slugify } from "@/lib/ai-center/utils";
import { appUrl } from "@/lib/site-config";

const CONFLICT_THRESHOLD = 55;

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    normalizeTitle(text)
      .split(" ")
      .filter((t) => t.length > 2)
  );
}

/** Jaccard similarity 0–100 between two titles. */
export function titleSimilarityPercent(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection += 1;
  }
  const union = ta.size + tb.size - intersection;
  if (union === 0) return 0;
  return Math.round((intersection / union) * 100);
}

export interface BlogConflictMatch {
  blogId: string;
  title: string;
  slug: string;
  status: AiBlogPost["status"];
  url: string;
  similarityPercent: number;
  reason: "exact_slug" | "exact_title" | "similar_title";
}

export interface TitleSimilarityResult {
  title: string;
  slug: string;
  status: "conflict" | "no_conflict";
  maxSimilarityPercent: number;
  conflicts: BlogConflictMatch[];
}

export function checkTitlesAgainstBlogs(
  titles: string[],
  blogs: AiBlogPost[]
): TitleSimilarityResult[] {
  const active = blogs.filter((b) => b.status !== "rejected");

  return titles.map((raw) => {
    const title = raw.trim().replace(/\s+/g, " ");
    const slug = slugify(title);
    const conflicts: BlogConflictMatch[] = [];

    for (const blog of active) {
      const blogSlug = blog.slug.toLowerCase();
      const exactSlug = Boolean(slug) && blogSlug === slug;
      const exactTitle =
        normalizeTitle(blog.title) === normalizeTitle(title) ||
        normalizeTitle(blog.keyword) === normalizeTitle(title);
      const similarity = Math.max(
        titleSimilarityPercent(title, blog.title),
        titleSimilarityPercent(title, blog.keyword)
      );

      if (!exactSlug && !exactTitle && similarity < CONFLICT_THRESHOLD) continue;

      conflicts.push({
        blogId: blog.id,
        title: blog.title,
        slug: blog.slug,
        status: blog.status,
        url: appUrl(`/blog/${blog.slug}`),
        similarityPercent: exactSlug || exactTitle ? 100 : similarity,
        reason: exactSlug ? "exact_slug" : exactTitle ? "exact_title" : "similar_title",
      });
    }

    conflicts.sort((a, b) => b.similarityPercent - a.similarityPercent);

    return {
      title,
      slug,
      status: conflicts.length > 0 ? "conflict" : "no_conflict",
      maxSimilarityPercent: conflicts[0]?.similarityPercent ?? 0,
      conflicts: conflicts.slice(0, 5),
    };
  });
}
