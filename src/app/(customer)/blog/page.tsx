import { PageHero } from "@/components/customer/page-hero";
import { getBlogPosts } from "@/lib/data-service";
import BlogListClient from "./blog-list-client";

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const published = posts.filter((p) => p.published);

  return (
    <>
      <PageHero
        title="Travel Blog"
        subtitle="Tips, guides and inspiration for your next Indian adventure"
        image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80"
      />
      <section className="container mx-auto px-4 py-10">
        <BlogListClient posts={published} />
      </section>
    </>
  );
}
