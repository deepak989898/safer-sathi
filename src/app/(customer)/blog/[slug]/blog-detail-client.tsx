"use client";

import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { localizedText } from "@/lib/i18n";
import type { BlogPost } from "@/types";
import { CatalogViewTracker } from "@/components/seo/catalog-view-tracker";

function renderMarkdownish(content: string) {
  return content.split("\n\n").map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-8 text-xl font-semibold">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (block.startsWith("# ")) {
      return (
        <h1 key={i} className="mt-4 text-2xl font-bold">
          {block.replace(/^#\s+/, "")}
        </h1>
      );
    }
    if (block.startsWith("**") && block.includes("**")) {
      return (
        <p key={i} className="mt-3 font-medium">
          {block.replace(/\*\*/g, "")}
        </p>
      );
    }
    return (
      <p key={i} className="mt-3 leading-relaxed text-muted-foreground">
        {block}
      </p>
    );
  });
}

export function BlogDetailClient({
  post,
  related = [],
}: {
  post: BlogPost;
  related?: BlogPost[];
}) {
  const { locale } = useAppStore();

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <CatalogViewTracker
        type="blog"
        id={post.slug}
        name={localizedText(post.title, locale)}
      />
      <Link href="/blog">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Button>
      </Link>

      <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-xl">
        <SafeImage
          src={post.image}
          alt={localizedText(post.title, locale)}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="capitalize">
            {tag}
          </Badge>
        ))}
      </div>

      <h1 className="text-3xl font-bold md:text-4xl">
        {localizedText(post.title, locale)}
      </h1>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-4 w-4" />
          {post.author}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(post.createdAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        {renderMarkdownish(localizedText(post.content, locale))}
      </div>

      {post.faq && post.faq.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">FAQ</h2>
          {post.faq.map((item) => (
            <Card key={item.question}>
              <CardContent className="pt-4">
                <p className="font-medium">{item.question}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Related Blogs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.id} href={`/blog/${r.slug}`}>
                <Card className="h-full hover:border-primary transition-colors">
                  <CardContent className="pt-4">
                    <p className="font-medium line-clamp-2">{localizedText(r.title, locale)}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {localizedText(r.excerpt, locale)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
