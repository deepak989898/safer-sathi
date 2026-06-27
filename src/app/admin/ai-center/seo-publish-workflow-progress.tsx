"use client";

import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Globe,
  Sparkles,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import type {
  SeoPublishWorkflowStage,
  SeoPublishWorkflowStats,
  SeoWorkflowStageStatus,
} from "@/lib/ai-center/utils";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<string, LucideIcon> = {
  approve: Sparkles,
  "seo-meta": Globe,
  "blog-draft": FileText,
  "blog-approve": CheckCircle2,
  publish: Upload,
};

function statusStyles(status: SeoWorkflowStageStatus) {
  switch (status) {
    case "complete":
      return {
        ring: "border-emerald-200 bg-emerald-50/80",
        icon: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-800",
        label: "Done",
      };
    case "in_progress":
      return {
        ring: "border-primary/30 bg-primary/5",
        icon: "text-primary",
        badge: "bg-primary/10 text-primary",
        label: "In progress",
      };
    case "waiting":
      return {
        ring: "border-muted bg-muted/30",
        icon: "text-muted-foreground",
        badge: "bg-muted text-muted-foreground",
        label: "Waiting",
      };
    default:
      return {
        ring: "border-dashed border-muted-foreground/25 bg-muted/10",
        icon: "text-muted-foreground/60",
        badge: "bg-muted text-muted-foreground",
        label: "Not started",
      };
  }
}

function WorkflowStageCard({
  stage,
  onGoToTab,
}: {
  stage: SeoPublishWorkflowStage;
  onGoToTab?: (tabId: string) => void;
}) {
  const Icon = STAGE_ICONS[stage.id] ?? Circle;
  const styles = statusStyles(stage.status);
  const clickable = Boolean(stage.tabId && onGoToTab && stage.status !== "empty");

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        if (stage.tabId && onGoToTab) onGoToTab(stage.tabId);
      }}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors sm:p-4",
        styles.ring,
        clickable && "cursor-pointer hover:border-primary/50 hover:shadow-sm",
        !clickable && "cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
          <div>
            <p className="text-sm font-semibold text-[#0c2444]">{stage.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            styles.badge
          )}
        >
          {styles.label}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <Progress value={stage.percent} className="gap-0">
          <ProgressTrack className="h-2">
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-emerald-700">
            {stage.completed.toLocaleString("en-IN")} completed
          </span>
          <span className="text-muted-foreground">
            {stage.remaining.toLocaleString("en-IN")} remaining
            {stage.total > 0 ? ` · ${stage.percent}%` : ""}
          </span>
        </div>
      </div>
    </button>
  );
}

export function SeoPublishWorkflowProgress({
  stats,
  onGoToTab,
  compact,
}: {
  stats: SeoPublishWorkflowStats;
  onGoToTab?: (tabId: string) => void;
  compact?: boolean;
}) {
  const { overallCompleted, overallTotal, overallPercent, remainingToPublish, stages } = stats;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
          <Clock className="h-5 w-5 text-primary" />
          SEO Keywords → Publish Progress
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track how many approved keywords have moved through each step to a live blog post.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums text-[#0c2444] sm:text-3xl">
                {overallCompleted.toLocaleString("en-IN")}
                <span className="text-lg font-semibold text-muted-foreground">
                  {" "}
                  / {overallTotal.toLocaleString("en-IN")} published
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {overallTotal === 0
                  ? "No approved keywords yet — search or approve keywords to start."
                  : remainingToPublish === 0
                    ? "All approved keywords are live on the blog."
                    : `${remainingToPublish.toLocaleString("en-IN")} approved keyword${remainingToPublish === 1 ? "" : "s"} still not published.`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-primary">{overallPercent}%</p>
              <p className="text-xs text-muted-foreground">overall complete</p>
            </div>
          </div>
          <Progress value={overallPercent} className="mt-4 gap-0">
            <ProgressTrack className="h-3">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>

        {!compact && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => (
              <WorkflowStageCard key={stage.id} stage={stage} onGoToTab={onGoToTab} />
            ))}
          </div>
        )}

        {compact && (
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span
                key={stage.id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  stage.status === "complete"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : stage.status === "in_progress"
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-muted bg-muted/30 text-muted-foreground"
                )}
              >
                {stage.label}: {stage.completed}/{stage.total || "—"}
              </span>
            ))}
          </div>
        )}

        {onGoToTab && !compact && (
          <p className="text-xs text-muted-foreground">
            Click a step card to jump to that tab and finish remaining work.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
