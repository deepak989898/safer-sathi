"use client";

import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { localizedText } from "@/lib/i18n";
import type { BlogPost } from "@/types";

export function BlogDetailClient({ post }: { post: BlogPost }) {
  const { locale } = useAppStore();

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
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
          <Badge key={tag} variant="secondary">
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
        <p className="text-lg leading-relaxed text-muted-foreground">
          {localizedText(post.content, locale)}
        </p>
      </div>
    </article>
  );
}
