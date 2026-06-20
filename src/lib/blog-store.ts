import {
  getBlogBySlug as getAiBlogBySlug,
  getPublishedBlogs,
  hydrateAiCenterStore,
} from "@/lib/ai-center/repository";
import type { AiBlogPost } from "@/lib/ai-center/types";
import { demoBlogPosts } from "@/data/demo-data";
import type { BlogPost } from "@/types";

function aiBlogToBlogPost(blog: AiBlogPost): BlogPost {
  return {
    id: blog.id,
    slug: blog.slug,
    title: { en: blog.title, hi: blog.title },
    excerpt: { en: blog.excerpt, hi: blog.excerpt },
    content: { en: blog.content, hi: blog.content },
    image: blog.featuredImage,
    author: "Safar Sathi Team",
    tags: [blog.category.replace(/_/g, " "), blog.destination ?? "India"].filter(Boolean),
    published: blog.status === "published",
    seoTitle: { en: blog.metaTitle, hi: blog.metaTitle },
    seoDescription: { en: blog.metaDescription, hi: blog.metaDescription },
    faq: blog.faq,
    createdAt: blog.publishedAt ?? blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

export async function hydrateBlogStore(): Promise<void> {
  await hydrateAiCenterStore();
}

export function getPublishedBlogPosts(): BlogPost[] {
  const firebase = getPublishedBlogs().map(aiBlogToBlogPost);
  if (firebase.length > 0) return firebase;
  return demoBlogPosts.filter((p) => p.published);
}

export function getPublishedBlogBySlug(slug: string): BlogPost | null {
  const ai = getAiBlogBySlug(slug);
  if (ai) return aiBlogToBlogPost(ai);
  return demoBlogPosts.find((p) => p.slug === slug && p.published) ?? null;
}

export function getAllPublishedBlogSlugs(): string[] {
  const slugs = getPublishedBlogs().map((b) => b.slug);
  if (slugs.length > 0) return slugs;
  return demoBlogPosts.filter((p) => p.published).map((p) => p.slug);
}

export function getRelatedBlogPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPublishedBlogBySlug(slug);
  return getPublishedBlogPosts()
    .filter((p) => p.slug !== slug)
    .filter((p) =>
      current
        ? p.tags.some((t) => current.tags.includes(t))
        : true
    )
    .slice(0, limit);
}

export function getBlogCategories(): string[] {
  const cats = new Set<string>();
  getPublishedBlogPosts().forEach((p) => p.tags.forEach((t) => cats.add(t)));
  return [...cats].sort();
}
