import { PageHero } from "@/components/customer/page-hero";
import {
  getBlogCategoriesList,
  getBlogPosts,
  getRelatedBlogPostsForSlug,
} from "@/lib/data-service";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import BlogListClient from "./blog-list-client";

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([
    getBlogPosts(),
    getBlogCategoriesList(),
  ]);
  const published = posts.filter((p) => p.published);

  return (
    <>
      <PageHero
        title="Travel Blog"
        subtitle="Tips, guides and inspiration for your next Indian adventure"
        image={HERO_IMAGES.blog}
      />
      <section className="container mx-auto px-4 py-10">
        <BlogListClient posts={published} categories={categories} />
      </section>
    </>
  );
}
