import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBlogPostBySlug,
  getRelatedBlogPostsForSlug,
} from "@/lib/data-service";
import { localizedText } from "@/lib/i18n";
import { buildPageMetadata, stripHtml } from "@/lib/seo/metadata";
import { blogPostingSchema, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { appUrl } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/json-ld";
import { BlogDetailClient } from "./blog-detail-client";

export async function generateStaticParams() {
  const { getAllBlogSlugs } = await import("@/lib/data-service");
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = true;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post || !post.published) return { title: "Blog | Safar Sathi" };

  const title = post.seoTitle
    ? localizedText(post.seoTitle, "en")
    : localizedText(post.title, "en");
  const description = post.seoDescription
    ? localizedText(post.seoDescription, "en")
    : stripHtml(localizedText(post.excerpt, "en"));

  return buildPageMetadata({
    title: `${title} | Safar Sathi Blog`,
    description: description.slice(0, 160),
    path: `/blog/${slug}`,
    image: post.image,
    type: "article",
    publishedTime: post.createdAt,
    modifiedTime: post.updatedAt,
    keywords: [...post.tags, "India travel blog", "Safar Sathi"],
  });
}

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

  const title = post.seoTitle
    ? localizedText(post.seoTitle, "en")
    : localizedText(post.title, "en");
  const description = post.seoDescription
    ? localizedText(post.seoDescription, "en")
    : stripHtml(localizedText(post.excerpt, "en"));
  const pageUrl = appUrl(`/blog/${slug}`);

  const schema = [
    blogPostingSchema({
      title,
      description,
      url: pageUrl,
      image: post.image,
      author: post.author,
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
    }),
    breadcrumbSchema([
      { name: "Home", url: appUrl() },
      { name: "Blog", url: appUrl("/blog") },
      { name: title, url: pageUrl },
    ]),
    faqSchema(post.faq ?? []),
  ].filter(Boolean);

  return (
    <>
      <JsonLd data={schema} />
      <BlogDetailClient post={post} related={related} />
    </>
  );
}
