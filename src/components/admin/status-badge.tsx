import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "confirmed"
  | "upcoming"
  | "completed"
  | "cancelled"
  | "pending"
  | "refunded"
  | "paid"
  | "partial"
  | "failed"
  | "active"
  | "paused"
  | "error"
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "vip"
  | "regular"
  | "new"
  | "at_risk"
  | "high"
  | "medium"
  | "low"
  | "success"
  | "default";

const variantStyles: Record<StatusVariant, string> = {
  confirmed: "bg-primary/15 text-primary border-primary/20",
  upcoming: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400",
  refunded: "bg-muted text-muted-foreground border-border",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  partial: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  paused: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400",
  error: "bg-destructive/15 text-destructive border-destructive/20",
  open: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400",
  in_progress: "bg-primary/15 text-primary border-primary/20",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground border-border",
  vip: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-400",
  regular: "bg-secondary text-secondary-foreground border-border",
  new: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400",
  at_risk: "bg-destructive/15 text-destructive border-destructive/20",
  high: "bg-destructive/15 text-destructive border-destructive/20",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/20 dark:text-amber-400",
  low: "bg-muted text-muted-foreground border-border",
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  default: "bg-muted text-muted-foreground border-border",
};

const labelMap: Record<StatusVariant, string> = {
  confirmed: "Confirmed",
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  refunded: "Refunded",
  paid: "Paid",
  partial: "Partial",
  failed: "Failed",
  active: "Active",
  paused: "Paused",
  error: "Error",
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  vip: "VIP",
  regular: "Regular",
  new: "New",
  at_risk: "At Risk",
  high: "High",
  medium: "Medium",
  low: "Low",
  success: "AI Processed",
  default: "Unknown",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = (status in variantStyles ? status : "default") as StatusVariant;
  const displayLabel =
    label ?? labelMap[variant] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium", variantStyles[variant], className)}
    >
      {displayLabel}
    </Badge>
  );
}
