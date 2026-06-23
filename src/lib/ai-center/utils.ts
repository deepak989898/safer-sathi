import type { AiBlogPost, SeoKeyword } from "@/lib/ai-center/types";

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
  return blogs.some((blog) => {
    if (blog.status === "rejected") return false;
    if (blog.keywordId === keyword.id) return true;
    return blog.keyword.toLowerCase().trim() === normalized;
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
