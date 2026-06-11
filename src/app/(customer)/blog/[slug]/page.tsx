import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/data-service";
import { BlogDetailClient } from "./blog-detail-client";

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post || !post.published) notFound();
  return <BlogDetailClient post={post} />;
}
