"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { SeoDashboardData } from "@/lib/seo/dashboard-service";
import { cn } from "@/lib/utils";

export function SeoCenterClient() {
  const { user } = useAuth();
  const [data, setData] = useState<SeoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/seo");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SEO dashboard");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error ?? "Unable to load SEO dashboard"}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SEO Center</h1>
          <p className="text-sm text-muted-foreground">
            Growth, search visibility, and AI SEO tools for Safar Sathi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={data.sitemapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Sitemap
          </a>
          <a
            href={data.robotsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            robots.txt
          </a>
          <Link href="/admin/ai-center?tab=seo" className={cn(buttonVariants({ size: "sm" }))}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI SEO Agent
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Indexed Pages"
          value={data.indexedPages.total}
          subtitle={`${data.indexedPages.packages} packages · ${data.indexedPages.hotels} hotels · ${data.indexedPages.vehicles} vehicles · ${data.indexedPages.blogs} blogs`}
          icon={Globe}
        />
        <StatCard
          title="Meta Coverage"
          value={`${data.metaTags.coveragePercent}%`}
          subtitle={`${data.metaTags.pagesWithDynamicMeta} pages with dynamic SEO`}
          icon={Search}
        />
        <StatCard
          title="AI Keywords"
          value={data.aiSeo.keywordsApproved}
          subtitle={`${data.aiSeo.keywordsPending} pending approval`}
          icon={Sparkles}
        />
        <StatCard
          title="Published Blogs"
          value={data.aiSeo.blogsPublished}
          subtitle={`${data.aiSeo.seoMetaRecords} SEO meta records`}
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analytics & Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusRow
              label="Google Analytics 4"
              ok={data.analytics.ga4Configured}
              detail={data.analytics.ga4Id}
            />
            <StatusRow
              label="Microsoft Clarity"
              ok={data.analytics.clarityConfigured}
              detail={data.analytics.clarityId}
            />
            <StatusRow label="Schema Markup" ok={data.schema.status === "good"} detail={data.schema.types.join(", ")} />
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_GA_ID</code> and{" "}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_CLARITY_ID</code> in production env.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Google Search Console</CardTitle>
            <Badge variant={data.searchPerformance.connected ? "default" : "secondary"}>
              {data.searchPerformance.connected ? "Connected" : "Not connected"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{data.searchConsole.note}</p>
            <p className={cn("text-muted-foreground", !data.searchPerformance.connected && "text-amber-700 dark:text-amber-400")}>
              {data.searchPerformance.message}
            </p>
            {data.searchPerformance.connected ? (
              <p className="text-xs text-muted-foreground">{data.searchPerformance.period}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Clicks</p>
                <p className="font-semibold">{data.searchPerformance.clicks ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Impressions</p>
                <p className="font-semibold">{data.searchPerformance.impressions ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="font-semibold">
                  {data.searchPerformance.ctr != null ? `${data.searchPerformance.ctr}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Avg. position</p>
                <p className="font-semibold">{data.searchPerformance.position ?? "—"}</p>
              </div>
            </div>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
            >
              Open Search Console
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google Business Profile Ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Phone:</strong> {data.googleBusiness.phone}
            </p>
            <p>
              <strong>Email:</strong> {data.googleBusiness.email}
            </p>
            <p>
              <strong>Address:</strong> {data.googleBusiness.address}
            </p>
            <a
              href={data.googleBusiness.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View on Google Maps
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Keywords (AI Center)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No keywords yet. Generate from AI Center.</p>
            ) : (
              <ul className="space-y-2">
                {data.topKeywords.map((kw) => (
                  <li
                    key={kw.keyword}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="truncate">{kw.keyword}</span>
                    <Badge variant="secondary">{kw.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/ai-center?tab=blog-writer"
              className={cn(buttonVariants({ variant: "secondary" }), "mt-4 w-full justify-center")}
            >
              AI Blog Writer
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance & Image SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <Badge variant="outline" className="justify-center py-2">
            Next.js Image Optimization ✓
          </Badge>
          <Badge variant="outline" className="justify-center py-2">
            Lazy Loading ✓
          </Badge>
          <Badge variant="outline" className="justify-center py-2">
            WebP / AVIF ✓
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      )}
      <div>
        <p className="font-medium">{label}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
