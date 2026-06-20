"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
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

const categoryStyles = {
  booking: "border-l-blue-500",
  ai_enquiry: "border-l-violet-500",
  approval: "border-l-amber-500",
} as const;

export function DailyAdminChecklist({ checklist }: DailyAdminChecklistProps) {
  const allClear =
    checklist.pendingBookings === 0 &&
    checklist.unconvertedAiChats === 0 &&
    checklist.pendingApprovals === 0;

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="size-5 text-primary" />
              Daily Admin Checklist
            </CardTitle>
            <CardDescription>
              Action items that need your attention today — no need to open multiple pages.
            </CardDescription>
          </div>
          {allClear && (
            <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              All clear
            </Badge>
          )}
        </div>
      </CardHeader>
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
                <span className={cn("text-2xl font-semibold tabular-nums", card.count > 0 && card.tone)}>
                  {card.count}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </Link>
          ))}
        </div>

        {checklist.items.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Top actions</p>
            <ul className="divide-y rounded-xl border">
              {checklist.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-start justify-between gap-3 border-l-4 px-4 py-3 transition-colors hover:bg-muted/40",
                      categoryStyles[item.category]
                    )}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.subtitle && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</p>
                      )}
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing urgent right now. Check back after new bookings or AI chats come in.
          </div>
        )}

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
    </Card>
  );
}
