"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { MediaManagerReport } from "@/lib/media/media-manager-service";
import { toast } from "sonner";

type BulkAction =
  | "bulk-fix-blogs"
  | "bulk-fix-catalog"
  | "bulk-fix-all"
  | "weekly-scan";

export function MediaManagerClient() {
  const { user } = useAuth();
  const [report, setReport] = useState<MediaManagerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/media-manager");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load report");
      setReport(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media report");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: BulkAction, mirrorToFirebase = false) => {
    if (!user?.role) return;
    setBusy(action);
    try {
      const res = await adminApiFetch("/api/admin/media-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mirrorToFirebase }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Action failed");
      if (action === "weekly-scan" && json.data?.report) {
        setReport(json.data.report);
      }
      toast.success(
        action === "weekly-scan" ? "Weekly image scan completed" : "Bulk optimization completed"
      );
      if (action !== "weekly-scan") await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !report) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const summary = report?.summary;

  return (
    <div className="space-y-6 p-3 sm:p-6">
      <AdminHeader
        title="Media Manager"
        description="Enterprise image intelligence — relevance scoring, SEO metadata, duplicate prevention"
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void runAction("weekly-scan")}
          disabled={!!busy}
        >
          {busy === "weekly-scan" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="mr-2 h-4 w-4" />
          )}
          Weekly Scan
        </Button>
        <Button size="sm" onClick={() => void runAction("bulk-fix-blogs")} disabled={!!busy}>
          {busy === "bulk-fix-blogs" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Auto-Fix All Blogs
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void runAction("bulk-fix-catalog")}
          disabled={!!busy}
        >
          Enrich Catalog
        </Button>
        <Button size="sm" onClick={() => void runAction("bulk-fix-all")} disabled={!!busy}>
          Full Optimization
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void runAction("bulk-fix-blogs", true)}
          disabled={!!busy}
        >
          <Upload className="mr-2 h-4 w-4" />
          Fix + Firebase Upload
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Run <strong>Auto-Fix All Blogs</strong> first to assign unique, title-relevant images. Use{" "}
        <strong>Fix + Firebase Upload</strong> only after you are happy with previews. You may delete
        the Firebase <code className="text-xs">blogs/</code> folder first to remove old duplicate
        files — blog content in Firestore is not affected.
      </p>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Site Health Score"
            value={`${summary.siteWideHealthScore}%`}
            ok={summary.siteWideHealthScore >= 75}
          />
          <StatCard
            title="Optimization Score"
            value={`${summary.optimizationScore}%`}
            ok={summary.optimizationScore >= 70}
          />
          <StatCard title="Total Unique Images" value={summary.totalImages} />
          <StatCard
            title="Duplicate Groups"
            value={summary.duplicateImageGroups}
            ok={summary.duplicateImageGroups === 0}
          />
          <StatCard
            title="Featured Overused (>5)"
            value={summary.featuredOverused}
            ok={summary.featuredOverused === 0}
          />
          <StatCard
            title="Missing ALT Text"
            value={summary.missingAltTags}
            ok={summary.missingAltTags === 0}
          />
          <StatCard
            title="Missing Captions"
            value={summary.missingCaptions}
            ok={summary.missingCaptions === 0}
          />
          <StatCard
            title="Low Relevance (<80)"
            value={summary.lowRelevanceImages}
            ok={summary.lowRelevanceImages === 0}
          />
        </div>
      ) : null}

      {report?.weeklyScanIssues && report.weeklyScanIssues.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">Weekly Scan Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {report.weeklyScanIssues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Used Images</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-3 overflow-y-auto text-sm">
            {!report?.mostUsedImages.length ? (
              <p className="text-muted-foreground">No usage data yet.</p>
            ) : (
              report.mostUsedImages.slice(0, 12).map((dup) => (
                <div key={dup.normalizedUrl} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={dup.count > 5 ? "destructive" : "secondary"}>
                      {dup.count} uses
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{dup.url}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Health Entities</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-2 overflow-y-auto text-sm">
            {!report?.lowHealthEntities.length ? (
              <p className="text-muted-foreground">All entities score 70%+ image health.</p>
            ) : (
              report.lowHealthEntities.map((e) => (
                <div
                  key={`${e.type}-${e.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.type} · {e.imageCount} images
                    </p>
                  </div>
                  <Badge variant={e.score < 50 ? "destructive" : "secondary"}>{e.score}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blogs Below Image Minimum</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-2 overflow-y-auto text-sm">
            {!report?.blogsNeedingImages.length ? (
              <p className="text-muted-foreground">All blogs meet word-count image minimums.</p>
            ) : (
              report.blogsNeedingImages.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <span className="truncate">{b.title}</span>
                  <div className="flex shrink-0 gap-1">
                    <Badge variant="outline">
                      {b.imageCount}/{b.minRequired}
                    </Badge>
                    <Badge variant="secondary">{b.healthScore}%</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duplicate Detection</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-3 overflow-y-auto text-sm">
            {!report?.duplicateImages.length ? (
              <p className="text-muted-foreground">No heavily duplicated images.</p>
            ) : (
              report.duplicateImages.slice(0, 10).map((dup) => (
                <div key={dup.normalizedUrl} className="rounded-lg border p-3">
                  <Badge variant="destructive">{dup.count} uses</Badge>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {dup.usedIn.slice(0, 3).map((u) => (
                      <li key={`${u.type}-${u.id}`}>
                        {u.type}: {u.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Phase 2 Intelligence Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>• Relevance score ≥ 80 required for image selection</p>
          <p>• Priority: destination → activity → attraction → generic</p>
          <p>• Featured images max 5 reuses across blogs</p>
          <p>• 4/6/8 images based on 1000/1500/2500+ word count</p>
          <p>• Descriptive ALT, title, caption — never generic placeholders</p>
          <p>• WebP 1200×675 optimized URLs + SEO file names on Firebase upload</p>
          <p>• New AI blogs auto-assign images with full metadata</p>
          <p>• Placement: top → 25% → 50% → 75% → bottom of content</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  ok,
}: {
  title: string;
  value: string | number;
  ok?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          {ok === true ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : ok === false ? (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
