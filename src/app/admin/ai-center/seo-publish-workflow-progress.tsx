"use client";

import type { SeoPublishWorkflowStats } from "@/lib/ai-center/utils";
import { cn } from "@/lib/utils";

function WorkflowLine({
  label,
  completed,
  total,
  remaining,
  onClick,
}: {
  label: string;
  completed: number;
  total: number;
  remaining: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="font-medium text-[#0c2444]">{label}</span>
      <span className="tabular-nums text-muted-foreground">
        {" "}
        — {completed}/{total || 0} completed
        {total > 0 && (
          <>
            {" "}
            · <span className="text-amber-700">{remaining} remaining</span>
          </>
        )}
      </span>
    </>
  );

  if (onClick && total > 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted/50"
      >
        {content}
      </button>
    );
  }

  return <p className="px-1 py-1.5 text-sm">{content}</p>;
}

export function SeoPublishWorkflowProgress({
  stats,
  onGoToTab,
  onlyStageId,
}: {
  stats: SeoPublishWorkflowStats;
  onGoToTab?: (tabId: string) => void;
  /** Show one step only (e.g. on Blog Writer tab). */
  onlyStageId?: string;
}) {
  const stages = onlyStageId
    ? stats.stages.filter((s) => s.id === onlyStageId)
    : stats.stages;

  if (stages.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2 sm:px-4">
      {!onlyStageId && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow progress
        </p>
      )}
      <div className={cn(!onlyStageId && "divide-y divide-border/60")}>
        {stages.map((stage) => (
          <WorkflowLine
            key={stage.id}
            label={stage.label}
            completed={stage.completed}
            total={stage.total}
            remaining={stage.remaining}
            onClick={
              stage.tabId && onGoToTab
                ? () => onGoToTab(stage.tabId!)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
