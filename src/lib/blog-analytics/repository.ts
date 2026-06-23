import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

const COLLECTION = "blog_view_counts";

interface BlogViewCountDoc {
  slug: string;
  title?: string;
  viewCount: number;
  lastViewedAt?: string;
}

const memoryCounts = new Map<string, number>();

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export async function incrementBlogView(slug: string, title?: string): Promise<void> {
  const key = normalizeSlug(slug);
  if (!key) return;

  if (!isAdminEnvConfigured()) {
    memoryCounts.set(key, (memoryCounts.get(key) ?? 0) + 1);
    return;
  }

  const db = await getSafeAdminDb();
  if (!db) {
    memoryCounts.set(key, (memoryCounts.get(key) ?? 0) + 1);
    return;
  }

  const ref = db.collection(COLLECTION).doc(key);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? Number(snap.data()?.viewCount ?? 0) : 0;
      tx.set(
        ref,
        {
          slug: key,
          title: title?.trim() || snap.data()?.title || key,
          viewCount: current + 1,
          lastViewedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  } catch (error) {
    console.warn("incrementBlogView failed:", error);
    memoryCounts.set(key, (memoryCounts.get(key) ?? 0) + 1);
  }
}

export async function getBlogViewCountsForSlugs(
  slugs: string[]
): Promise<Record<string, number>> {
  const keys = [...new Set(slugs.map(normalizeSlug).filter(Boolean))];
  const result: Record<string, number> = {};
  if (keys.length === 0) return result;

  for (const key of keys) {
    if (memoryCounts.has(key)) result[key] = memoryCounts.get(key)!;
  }

  if (!isAdminEnvConfigured()) return result;

  const db = await getSafeAdminDb();
  if (!db) return result;

  try {
    const refs = keys.map((key) => db.collection(COLLECTION).doc(key));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() as BlogViewCountDoc;
      const key = normalizeSlug(data.slug || snap.id);
      result[key] = Math.max(result[key] ?? 0, Number(data.viewCount ?? 0));
    }
  } catch (error) {
    console.warn("getBlogViewCountsForSlugs failed:", error);
  }

  return result;
}

export async function attachBlogViewCounts<T extends { slug: string }>(
  blogs: T[]
): Promise<(T & { viewCount: number })[]> {
  const counts = await getBlogViewCountsForSlugs(blogs.map((b) => b.slug));
  const enriched = await enrichCountsFromVisitorSessions(counts, blogs.map((b) => b.slug));
  return blogs.map((blog) => ({
    ...blog,
    viewCount: enriched[normalizeSlug(blog.slug)] ?? 0,
  }));
}

/** Include historical /blog/* page views from visitor sessions when counter is lower. */
async function enrichCountsFromVisitorSessions(
  counts: Record<string, number>,
  slugs: string[]
): Promise<Record<string, number>> {
  const slugSet = new Set(slugs.map(normalizeSlug).filter(Boolean));
  if (slugSet.size === 0) return counts;

  try {
    const { listVisitorSessions } = await import("@/lib/visitor-analytics/repository");
    const sessions = await listVisitorSessions(500);
    const fromSessions: Record<string, number> = {};

    for (const session of sessions) {
      for (const event of session.events) {
        if (event.type !== "page_view") continue;
        const match = event.path.match(/\/blog\/([^/?#]+)/i);
        if (!match) continue;
        const slug = normalizeSlug(decodeURIComponent(match[1]));
        if (!slugSet.has(slug)) continue;
        fromSessions[slug] = (fromSessions[slug] ?? 0) + 1;
      }
    }

    const merged = { ...counts };
    for (const slug of slugSet) {
      merged[slug] = Math.max(merged[slug] ?? 0, fromSessions[slug] ?? 0);
    }
    return merged;
  } catch {
    return counts;
  }
}
