"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ImageIcon,
  Loader2,
  PenLine,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { TitleSimilarityResult } from "@/lib/ai-center/blog-title-similarity";
import {
  MANUAL_BLOG_IMAGE_OPTIONS,
  type ManualBlogImageModeId,
} from "@/lib/media/manual-blog-image-options";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ManualTitlesTabProps {
  openAiImagesEnabled: boolean;
  onPublished?: () => void;
}

function parseTitles(raw: string): string[] {
  const lines = raw
    .split(/\n|,/)
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter((t) => t.length > 0);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of lines) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return unique;
}

export function ManualTitlesTab({
  openAiImagesEnabled,
  onPublished,
}: ManualTitlesTabProps) {
  const [rawTitles, setRawTitles] = useState("");
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<TitleSimilarityResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageMode, setImageMode] = useState<ManualBlogImageModeId>("catalog");
  const [autoPublish, setAutoPublish] = useState(true);

  const titlesPreview = useMemo(() => parseTitles(rawTitles), [rawTitles]);

  const conflicts = useMemo(
    () => (results ?? []).filter((r) => r.status === "conflict"),
    [results]
  );
  const noConflict = useMemo(
    () => (results ?? []).filter((r) => r.status === "no_conflict"),
    [results]
  );

  const selectedCount = selected.size;

  function toggleTitle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function selectGroup(items: TitleSimilarityResult[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (on) next.add(item.title);
        else next.delete(item.title);
      }
      return next;
    });
  }

  async function runSimilarityCheck() {
    const titles = parseTitles(rawTitles);
    if (titles.length === 0) {
      toast.error("Enter at least one title (one per line)");
      return;
    }
    const tooShort = titles.filter((t) => t.length < 8);
    if (tooShort.length > 0) {
      toast.error(`Titles must be at least 8 characters: "${tooShort[0]}"`);
      return;
    }
    if (titles.length > 40) {
      toast.error("Max 40 titles per batch");
      return;
    }

    setChecking(true);
    setResults(null);
    setSelected(new Set());
    try {
      const res = await adminApiFetch("/api/admin/ai-center/blogs/title-similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Similarity check failed");
        return;
      }
      const list = (data.data?.results ?? []) as TitleSimilarityResult[];
      setResults(list);
      // Pre-select no-conflict titles
      setSelected(new Set(list.filter((r) => r.status === "no_conflict").map((r) => r.title)));
      toast.success(
        `Checked ${list.length} title${list.length === 1 ? "" : "s"} — ${
          list.filter((r) => r.status === "conflict").length
        } conflict(s)`
      );
    } catch {
      toast.error("Similarity check failed");
    } finally {
      setChecking(false);
    }
  }

  async function generateSelected() {
    if (selectedCount === 0) {
      toast.error("Select at least one title");
      return;
    }
    if (imageMode === "ai" && !openAiImagesEnabled) {
      toast.error("Enable OpenAI images in AI Settings first, or pick a free stock option");
      return;
    }

    const titles = Array.from(selected);
    setGenerating(true);
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < titles.length; i += 1) {
      const title = titles[i];
      setProgress(`Generating ${i + 1}/${titles.length}: ${title}`);
      try {
        const res = await adminApiFetch("/api/admin/ai-center/blogs/from-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            imageMode,
            autoPublish,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          fail += 1;
          toast.error(data.error || `Failed: ${title}`);
          continue;
        }
        ok += 1;
        if (data.data?.imageGenerationMessage) {
          toast.message(data.data.imageGenerationMessage);
        }
      } catch {
        fail += 1;
        toast.error(`Failed: ${title}`);
      }
    }

    setGenerating(false);
    setProgress("");
    if (ok > 0) {
      toast.success(
        autoPublish
          ? `Published ${ok} blog${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`
          : `Created ${ok} draft${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`
      );
      onPublished?.();
      // Clear generated titles from selection
      setSelected(new Set());
      setResults((prev) =>
        prev ? prev.filter((r) => !titles.includes(r.title)) : prev
      );
    } else if (fail > 0) {
      toast.error("All generations failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-5 w-5" />
            Manual Titles → Generate & Publish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter one or more blog titles (one per line). Click{" "}
            <strong>Check Similarity</strong> to scan existing site blogs, then pick conflict /
            no-conflict titles, choose an image source, and generate + auto-publish.
          </p>

          <div className="space-y-2">
            <Label htmlFor="manual-titles">Blog titles</Label>
            <Textarea
              id="manual-titles"
              rows={6}
              placeholder={`Best places to visit in Orai\nWeekend trip from Lucknow to Ayodhya\nJaipur heritage walk itinerary`}
              value={rawTitles}
              onChange={(e) => setRawTitles(e.target.value)}
              disabled={checking || generating}
            />
            <p className="text-xs text-muted-foreground">
              {titlesPreview.length} unique title{titlesPreview.length === 1 ? "" : "s"} ready
              (max 40)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void runSimilarityCheck()}
              disabled={checking || generating || titlesPreview.length === 0}
            >
              {checking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Check Similarity
            </Button>
            {results && (
              <Badge variant="secondary">
                {conflicts.length} conflict · {noConflict.length} clear
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <TitleGroup
              title="Conflicts"
              description="Similar or matching blogs already on the site"
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              items={conflicts}
              selected={selected}
              onToggle={toggleTitle}
              onSelectAll={(on) => selectGroup(conflicts, on)}
              conflict
              disabled={generating}
            />
            <TitleGroup
              title="No conflict"
              description="Safe to generate — no close match found"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              items={noConflict}
              selected={selected}
              onToggle={toggleTitle}
              onSelectAll={(on) => selectGroup(noConflict, on)}
              disabled={generating}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-5 w-5" />
                Image source & publish
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {MANUAL_BLOG_IMAGE_OPTIONS.map((opt) => {
                  const disabled = opt.id === "ai" && !openAiImagesEnabled;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled || generating}
                      onClick={() => setImageMode(opt.id)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        imageMode === opt.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                        disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        {imageMode === opt.id && <Check className="h-4 w-4 text-primary" />}
                        {opt.label}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Auto publish</p>
                  <p className="text-xs text-muted-foreground">
                    Publish live immediately after generation
                  </p>
                </div>
                <Switch
                  checked={autoPublish}
                  onCheckedChange={setAutoPublish}
                  disabled={generating}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void generateSelected()}
                  disabled={generating || selectedCount === 0}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate {selectedCount > 0 ? selectedCount : ""} selected
                  {autoPublish ? " & publish" : ""}
                </Button>
                {progress && (
                  <p className="text-sm text-muted-foreground">{progress}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TitleGroup({
  title,
  description,
  icon,
  items,
  selected,
  onToggle,
  onSelectAll,
  conflict,
  disabled,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  items: TitleSimilarityResult[];
  selected: Set<string>;
  onToggle: (title: string) => void;
  onSelectAll: (on: boolean) => void;
  conflict?: boolean;
  disabled?: boolean;
}) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.title));

  return (
    <Card className={conflict ? "border-amber-200" : "border-emerald-200"}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
              <Badge variant="outline">{items.length}</Badge>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          {items.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onSelectAll(!allSelected)}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in this group.</p>
        ) : (
          items.map((item) => {
            const isOn = selected.has(item.title);
            const top = item.conflicts[0];
            return (
              <label
                key={item.title}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                  isOn ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                  disabled && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isOn}
                  disabled={disabled}
                  onChange={() => onToggle(item.title)}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium leading-snug">{item.title}</p>
                  {conflict && top && (
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {item.maxSimilarityPercent}% similar
                        </span>
                        {" · "}
                        conflicts with{" "}
                        <a
                          href={top.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {top.title}
                        </a>
                      </p>
                      <p className="truncate opacity-80">{top.url}</p>
                    </div>
                  )}
                  {!conflict && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      No close match (0–{item.maxSimilarityPercent}%)
                    </p>
                  )}
                </div>
              </label>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
