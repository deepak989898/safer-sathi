import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subStats?: { label: string; value: string | number }[];
  icon: LucideIcon;
  iconClassName?: string;
  compact?: boolean;
  valueClassName?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  subStats,
  icon: Icon,
  iconClassName,
  compact = false,
  valueClassName,
}: MetricCardProps) {
  return (
    <Card className={cn("shadow-sm", compact && "shadow-none")}>
      <CardContent
        className={cn(
          "flex items-start justify-between",
          compact ? "p-3 pt-3" : "pt-6"
        )}
      >
        <div className={cn(compact ? "min-w-0 space-y-0.5" : "space-y-2")}>
          <p
            className={cn(
              "font-medium text-muted-foreground",
              compact ? "truncate text-[11px] leading-tight" : "text-sm"
            )}
            title={title}
          >
            {title}
          </p>
          <p
            className={cn(
              "font-semibold tracking-tight",
              compact ? "truncate text-base leading-snug" : "text-2xl",
              valueClassName
            )}
            title={value}
          >
            {value}
          </p>
          {subStats && subStats.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap gap-x-3 gap-y-0.5 font-medium text-muted-foreground",
                compact ? "text-[10px] leading-tight" : "text-xs"
              )}
            >
              {subStats.map((stat) => (
                <span key={stat.label}>
                  <span className="text-foreground">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString("en-IN")
                      : stat.value}
                  </span>{" "}
                  {stat.label}
                </span>
              ))}
            </div>
          )}
          {change && (
            <p
              className={cn(
                "font-medium",
                compact ? "truncate text-[10px] leading-tight" : "text-xs",
                changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
              title={change}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            compact ? "size-8 rounded-md" : "size-11 rounded-xl",
            iconClassName
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-5"} />
        </div>
      </CardContent>
    </Card>
  );
}
