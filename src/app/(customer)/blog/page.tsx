import {
  getBlogCategoriesList,
  getBlogPosts,
} from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import BlogListClient from "./blog-list-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildPageMetadata({
  title: "Travel Blog | Safar Sathi India Guides",
  description:
    "Read India travel tips, destination guides, and holiday ideas from Safar Sathi — tours, hotels, and road trips.",
  path: "/blog",
  keywords: ["India travel blog", "Manali travel guide", "Goa trip tips", "Safar Sathi blog"],
  image: HERO_IMAGES.blog,
});

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getBlogPosts(),
    getBlogCategoriesList(),
  ]);
  const published = posts.filter((p) => p.published);

  return (
    <section className="container mx-auto px-4 py-8 sm:py-10">
      <BlogListClient posts={published} categories={categories} />
    </section>
  );
}
