"use client";

import type { ReactNode } from "react";

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

function isInternalHref(href: string): boolean {
  return href.startsWith("/") || href.includes("thesafarsathi.com");
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-b-${idx++}`}>{token.slice(2, -2)}</strong>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (isInternalHref(href)) {
          const path = href.includes("thesafarsathi.com")
            ? href.replace(/^https?:\/\/[^/]+/, "") || "/"
            : href;
          parts.push(
            <Link
              key={`${keyPrefix}-l-${idx++}`}
              href={path}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          );
        } else {
          parts.push(
            <a
              key={`${keyPrefix}-a-${idx++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {label}
            </a>
          );
        }
      } else {
        parts.push(token);
      }
    }
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdownish(content: string) {
  return content.split("\n\n").map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-8 text-xl font-semibold">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} className="mt-4 text-2xl font-bold">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((line) => line.startsWith("- "));
      return (
        <ul key={i} className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item.replace(/^-\s+/, ""), `li-${i}-${j}`)}</li>
          ))}
        </ul>
      );
    }
    if (trimmed.startsWith("|")) {
      return (
        <pre key={i} className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-sm">
          {trimmed}
        </pre>
      );
    }

    return (
      <p key={i} className="mt-3 leading-relaxed text-muted-foreground">
        {renderInline(trimmed, `p-${i}`)}
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

      <Card className="mt-10 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">Book on Safar Sathi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare tour packages, hotels, and vehicles — book directly on our website.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" render={<Link href="/packages" />}>
              Tour Packages
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/hotels" />}>
              Hotels
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/vehicles" />}>
              Vehicles
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/booking" />}>
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>

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
