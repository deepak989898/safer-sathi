"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import type { MediaManagerReport } from "@/lib/media/media-manager-service";
import { toast } from "sonner";

export function MediaManagerClient() {
  const { user } = useAuth();
  const [report, setReport] = useState<MediaManagerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.role) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/media-manager?actorRole=${encodeURIComponent(user.role)}`
      );
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

  const runAction = async (
    action: "bulk-fix-blogs" | "bulk-fix-catalog" | "bulk-fix-all",
    mirrorToFirebase = false
  ) => {
    if (!user?.role) return;
    setBusy(action);
    try {
      const res = await fetch("/api/admin/media-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole: user.role, action, mirrorToFirebase }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Action failed");
      toast.success("Bulk image optimization completed");
      await load();
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
        description="Blog & catalog image optimization, duplicate detection, and bulk updates"
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Report
        </Button>
        <Button
          size="sm"
          onClick={() => void runAction("bulk-fix-blogs")}
          disabled={!!busy}
        >
          {busy === "bulk-fix-blogs" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Auto-Fix All Blog Images
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void runAction("bulk-fix-catalog")}
          disabled={!!busy}
        >
          Enrich Package/Hotel/Vehicle Images
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={() => void runAction("bulk-fix-all")}
          disabled={!!busy}
        >
          Run Full Optimization
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void runAction("bulk-fix-blogs", true)}
          disabled={!!busy}
        >
          <Upload className="mr-2 h-4 w-4" />
          Fix Blogs + Upload to Firebase
        </Button>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            title="Missing Alt Tags"
            value={summary.missingAltTags}
            ok={summary.missingAltTags === 0}
          />
          <StatCard
            title="Blogs With Few Images"
            value={summary.blogsWithFewImages}
            ok={summary.blogsWithFewImages === 0}
          />
          <StatCard
            title="Packages Below 8 Images"
            value={summary.catalog.packagesBelowMin}
          />
          <StatCard title="Hotels Below 8 Images" value={summary.catalog.hotelsBelowMin} />
          <StatCard title="Vehicles Below 6 Images" value={summary.catalog.vehiclesBelowMin} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duplicate Image Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!report?.duplicateImages.length ? (
              <p className="text-muted-foreground">No heavily duplicated images detected.</p>
            ) : (
              report.duplicateImages.slice(0, 15).map((dup) => (
                <div key={dup.normalizedUrl} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="destructive">{dup.count} uses</Badge>
                    <span className="truncate text-xs text-muted-foreground">{dup.url}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {dup.usedIn.slice(0, 5).map((u) => (
                      <li key={`${u.type}-${u.id}`}>
                        {u.type}: {u.title}
                      </li>
                    ))}
                    {dup.usedIn.length > 5 ? (
                      <li>+{dup.usedIn.length - 5} more…</li>
                    ) : null}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blogs Needing Images</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
            {!report?.blogsNeedingImages.length ? (
              <p className="text-muted-foreground">All blogs have at least 4 images assigned.</p>
            ) : (
              report.blogsNeedingImages.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <span className="truncate">{b.title}</span>
                  <Badge variant="secondary">{b.imageCount} imgs</Badge>
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
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>• Maps each blog to a destination image pool (Manali, Goa, Kerala, etc.)</p>
          <p>• Assigns 4–8 unique images with alt, title, and caption for SEO</p>
          <p>• Rotates images across blogs so the same URL is not reused hundreds of times</p>
          <p>• New AI blogs automatically get destination-matched images on creation</p>
          <p>• Catalog items are enriched to minimum image counts without removing existing URLs</p>
          <p>• Optional Firebase upload mirrors external images to your storage bucket</p>
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
