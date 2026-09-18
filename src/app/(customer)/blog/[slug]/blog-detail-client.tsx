"use client";

import type { ReactNode } from "react";

import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronDown, User } from "lucide-react";
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

function parseFaqPair(block: string): { question: string; answer: string } | null {
  const trimmed = block.trim();
  const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*\n+([\s\S]+)$/);
  if (boldMatch) {
    return { question: boldMatch[1].trim(), answer: boldMatch[2].trim() };
  }
  const inlineBold = trimmed.match(/^\*\*(.+?\?)\*\*\s+([\s\S]+)$/);
  if (inlineBold) {
    return { question: inlineBold[1].trim(), answer: inlineBold[2].trim() };
  }
  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    lines.length >= 2 &&
    /\?$/.test(lines[0]) &&
    !lines[0].startsWith("#") &&
    !lines[0].startsWith("-")
  ) {
    return {
      question: lines[0].replace(/^\*\*|\*\*$/g, ""),
      answer: lines.slice(1).join(" "),
    };
  }
  return null;
}

function BlogFaqAccordion({
  items,
  className,
}: {
  items: { question: string; answer: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={className ?? "mt-3 space-y-2 not-prose"}>
      {items.map((item, i) => (
        <details
          key={`${item.question}-${i}`}
          className="group rounded-lg border bg-card [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium text-foreground">
            <span>{item.question}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}

function renderMarkdownish(content: string) {
  const blocks = content.split("\n\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const trimmed = blocks[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^##\s+faq\b/i.test(trimmed)) {
      const faqItems: { question: string; answer: string }[] = [];
      let j = i + 1;
      while (j < blocks.length) {
        const next = blocks[j].trim();
        if (!next) {
          j += 1;
          continue;
        }
        if (/^#{1,2}\s+/.test(next)) break;
        const pair = parseFaqPair(next);
        if (pair) {
          faqItems.push(pair);
          j += 1;
          continue;
        }
        break;
      }

      nodes.push(
        <div key={`faq-md-${i}`} className="mt-8">
          <h2 className="text-xl font-semibold">{trimmed.replace(/^##\s+/, "")}</h2>
          <BlogFaqAccordion items={faqItems} />
        </div>
      );
      i = j;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={i}
          className="mt-5 flex items-start gap-2 text-base font-semibold text-foreground"
        >
          <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
            →
          </span>
          <span>{trimmed.replace(/^###\s+/, "")}</span>
        </h3>
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="mt-8 text-xl font-semibold">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="mt-4 text-2xl font-bold">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split("\n").filter((line) => line.startsWith("- "));
      nodes.push(
        <ul key={i} className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item.replace(/^-\s+/, ""), `li-${i}-${j}`)}</li>
          ))}
        </ul>
      );
      i += 1;
      continue;
    }
    if (trimmed.startsWith("|")) {
      nodes.push(
        <pre key={i} className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-sm">
          {trimmed}
        </pre>
      );
      i += 1;
      continue;
    }

    nodes.push(
      <p key={i} className="mt-3 leading-relaxed text-muted-foreground">
        {renderInline(trimmed, `p-${i}`)}
      </p>
    );
    i += 1;
  }

  return nodes;
}

export function BlogDetailClient({
  post,
  related = [],
}: {
  post: BlogPost;
  related?: BlogPost[];
}) {
  const { locale } = useAppStore();
  const contentText = localizedText(post.content, locale);
  const contentHasFaqSection = /^##\s+faq\b/im.test(contentText);
  const contentHasStructuredOutline =
    /##\s+how to reach/i.test(contentText) &&
    /###\s+bus/i.test(contentText) &&
    /##\s+where to stay/i.test(contentText) &&
    /##\s+what to do/i.test(contentText) &&
    /##\s+cost/i.test(contentText);

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

      <figure className="mb-8 overflow-hidden rounded-xl border bg-muted/10">
        <SafeImage
          src={post.image}
          alt={post.gallery?.[0]?.alt ?? localizedText(post.title, locale)}
          title={post.gallery?.[0]?.title}
          width={1024}
          height={1024}
          className="mx-auto block h-auto w-full max-h-[min(72vh,560px)] object-contain object-center"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </figure>

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
        {contentHasStructuredOutline && (
          <aside className="not-prose mb-8 rounded-xl border bg-muted/30 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Travel guide sections</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">How to Reach</span>
                <span className="mt-1 block pl-3">→ Bus · Flight · Train · Taxi</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Where to Stay</span>
                <span className="mt-1 block pl-3">
                  → Hotels · Budget hotels · Family hotels · Honeymoon hotels
                </span>
              </li>
              <li>
                <span className="font-medium text-foreground">What to Do</span>
                <span className="mt-1 block pl-3">→ Places · Activities · Attractions</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Cost</span>
                <span className="mt-1 block pl-3">
                  → Travel cost · Hotel cost · Food cost · Local transport
                </span>
              </li>
            </ul>
          </aside>
        )}
        {renderMarkdownish(contentText)}
      </div>

      {post.gallery && post.gallery.length > 1 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Photo Gallery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {post.gallery
              .filter((img) => img.placement !== "top")
              .map((img) => (
              <figure key={`${img.url}-${img.placement ?? img.type}`} className="overflow-hidden rounded-xl border bg-muted/10">
                <div className="relative aspect-[4/3] sm:aspect-video">
                  <SafeImage
                    src={img.url}
                    alt={img.alt}
                    title={img.title}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                  {img.caption ?? img.title}
                  {img.type ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                      {img.type}
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

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

      {post.faq && post.faq.length > 0 && !contentHasFaqSection && (
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <BlogFaqAccordion items={post.faq} className="space-y-2" />
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
