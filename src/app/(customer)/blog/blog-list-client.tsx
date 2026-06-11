"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { localizedText } from "@/lib/i18n";
import type { BlogPost } from "@/types";

export default function BlogListClient({ posts }: { posts: BlogPost[] }) {
  const { locale } = useAppStore();

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Link key={post.id} href={`/blog/${post.slug}`}>
          <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-lg">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={post.image}
                alt={localizedText(post.title, locale)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h3 className="line-clamp-2 font-semibold leading-snug">
                {localizedText(post.title, locale)}
              </h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {localizedText(post.excerpt, locale)}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
