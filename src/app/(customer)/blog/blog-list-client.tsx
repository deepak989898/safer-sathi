"use client";

import { useMemo, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Calendar, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { BlogPost } from "@/types";

export default function BlogListClient({
  posts,
  categories,
}: {
  posts: BlogPost[];
  categories: string[];
}) {
  const { locale } = useAppStore();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const title = localizedText(post.title, locale).toLowerCase();
      const excerpt = localizedText(post.excerpt, locale).toLowerCase();
      const q = query.toLowerCase();
      const matchesQuery = !q || title.includes(q) || excerpt.includes(q);
      const matchesCategory =
        !activeCategory || post.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase());
      return matchesQuery && matchesCategory;
    });
  }, [posts, query, activeCategory, locale]);

  const popular = useMemo(
    () => [...posts].sort((a, b) => b.tags.length - a.tags.length).slice(0, 3),
    [posts]
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search blogs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                !activeCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize",
                  activeCategory === cat ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {filtered.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/10 sm:aspect-[16/10]">
                  <SafeImage
                    src={post.image}
                    alt={localizedText(post.title, locale)}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs capitalize">
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

        {filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No blogs match your search.</p>
        )}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Popular Blogs</h3>
            <div className="space-y-3">
              {popular.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block text-sm hover:text-primary"
                >
                  {localizedText(post.title, locale)}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
