import { notFound } from "next/navigation";
import {
  getBlogPostBySlug,
  getRelatedBlogPostsForSlug,
} from "@/lib/data-service";
import { BlogDetailClient } from "./blog-detail-client";

export async function generateStaticParams() {
  const { getAllBlogSlugs } = await import("@/lib/data-service");
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = true;

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, related] = await Promise.all([
    getBlogPostBySlug(slug),
    getRelatedBlogPostsForSlug(slug, 3),
  ]);
  if (!post || !post.published) notFound();
  return <BlogDetailClient post={post} related={related} />;
}
