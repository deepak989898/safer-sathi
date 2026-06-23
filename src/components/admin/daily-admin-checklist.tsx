"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Package,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminDailyChecklist } from "@/lib/admin/daily-checklist";
import { cn } from "@/lib/utils";

interface DailyAdminChecklistProps {
  checklist: AdminDailyChecklist;
}

export function DailyAdminChecklist({ checklist }: DailyAdminChecklistProps) {
  const [expanded, setExpanded] = useState(false);

  const allClear =
    checklist.pendingBookings === 0 &&
    checklist.unconvertedAiChats === 0 &&
    checklist.pendingApprovals === 0;

  const totalActions =
    checklist.pendingBookings +
    checklist.unconvertedAiChats +
    checklist.pendingApprovals;

  const summaryCards = [
    {
      label: "Pending bookings",
      count: checklist.pendingBookings,
      href: "/admin/bookings",
      icon: CalendarCheck,
      hint: "Unpaid, partial, or unconfirmed",
      tone: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "AI follow-ups",
      count: checklist.unconvertedAiChats,
      href: "/admin/ai-enquiries",
      icon: MessageSquare,
      hint: "High-intent chats (last 7 days)",
      tone: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Pending approvals",
      count: checklist.pendingApprovals,
      href: "/admin/packages",
      icon: Package,
      hint: "Packages & staff accounts",
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {expanded ? (
                <ChevronDown className="size-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-5 text-muted-foreground" />
              )}
              <ClipboardList className="size-5 text-primary" />
              Daily Admin Checklist
            </CardTitle>
            <CardDescription>
              {expanded
                ? "Summary counts — open the bell icon for booking alerts and pending actions."
                : totalActions > 0
                  ? `${totalActions} item${totalActions === 1 ? "" : "s"} need attention — click to expand`
                  : "All clear — click to expand summary"}
            </CardDescription>
          </div>
          {allClear ? (
            <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              All clear
            </Badge>
          ) : (
            <Badge variant="secondary" className="tabular-nums">
              {totalActions}
            </Badge>
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={cn(
                  "rounded-xl border p-4 transition-colors hover:bg-muted/40",
                  card.count > 0 && "ring-1 ring-primary/10"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("rounded-lg p-2", card.bg)}>
                    <card.icon className={cn("size-4", card.tone)} />
                  </div>
                  <span
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      card.count > 0 && card.tone
                    )}
                  >
                    {card.count}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium">{card.label}</p>
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </Link>
            ))}
          </div>

          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Pending booking confirmations, payment issues, and other alerts appear in the
            notification bell at the top right.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" render={<Link href="/admin/bookings" />}>
              Open bookings
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/admin/ai-enquiries" />}>
              Open AI enquiries
            </Button>
            {checklist.pendingApprovals > 0 && (
              <Button variant="outline" size="sm" render={<Link href="/admin/packages" />}>
                Review approvals
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
