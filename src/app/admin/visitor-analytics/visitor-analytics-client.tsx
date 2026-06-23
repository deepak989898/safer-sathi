"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  LogOut,
  MousePointerClick,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { MetricCard } from "@/components/admin/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { CLARITY_PROJECT_ID, getClarityDashboardUrl } from "@/lib/analytics/config";
import {
  eventTypeLabel,
  formatDuration,
  formatEventTime,
} from "@/lib/visitor-analytics/format";
import { ONLINE_THRESHOLD_MS } from "@/lib/visitor-analytics/constants";
import { cn } from "@/lib/utils";
import type {
  VisitorAnalyticsPayload,
  VisitorDayGroup,
  VisitorEvent,
  VisitorSession,
} from "@/types/visitor-analytics";
import { toast } from "sonner";

function isOnline(session: VisitorSession): boolean {
  return Date.now() - new Date(session.lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
}

function EventRow({ event }: { event: VisitorEvent }) {
  return (
    <div className="flex flex-wrap items-start gap-2 border-b border-dashed py-2 text-xs last:border-0">
      <span className="shrink-0 font-mono text-muted-foreground">{formatEventTime(event.at)}</span>
      <Badge variant="outline" className="h-5 text-[10px]">
        {eventTypeLabel(event.type)}
      </Badge>
      <span className="min-w-0 flex-1 break-all text-foreground/90">
        {event.type === "search" && event.searchQuery
          ? `Searched: "${event.searchQuery}"`
          : event.type === "click"
            ? `Clicked: ${event.label ?? "element"}${event.target ? ` → ${event.target}` : ""}`
            : event.type === "exit"
              ? `Left from ${event.path}`
              : event.title || event.path}
      </span>
      {event.path && event.type !== "exit" && (
        <span className="w-full text-[10px] text-muted-foreground">{event.path}</span>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: VisitorSession }) {
  const [open, setOpen] = useState(false);
  const online = isOnline(session);
  const visibleEvents = session.events.filter((e) => e.type !== "heartbeat");

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{formatEventTime(session.startedAt)}</p>
            {session.endedAt !== session.startedAt && (
              <span className="text-xs text-muted-foreground">
                → {formatEventTime(session.endedAt)}
              </span>
            )}
            {online && (
              <Badge className="h-5 bg-green-600 text-[10px] hover:bg-green-600">Online</Badge>
            )}
            <Badge variant="secondary" className="h-5 text-[10px]">
              {formatDuration(session.durationSec)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {session.source}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {session.pageViewCount} views
            </span>
            <span className="inline-flex items-center gap-1">
              <MousePointerClick className="h-3.5 w-3.5" />
              {session.clickCount} clicks
            </span>
            {session.searchCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Search className="h-3.5 w-3.5" />
                {session.searchCount} searches
              </span>
            )}
            <span>{session.device} · {session.browser}</span>
            {session.ip && <span className="font-mono">{session.ip}</span>}
            {session.country && <span>{session.country}</span>}
          </div>
          <p className="text-xs text-foreground/80">
            Entry: {session.entryPath}
            {session.exitPath !== session.entryPath && ` · Exit: ${session.exitPath}`}
          </p>
          {session.referrer && (
            <p className="truncate text-[10px] text-muted-foreground">Referrer: {session.referrer}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t bg-muted/10 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Visitor ID: <span className="font-mono">{session.visitorId}</span>
          </p>
          {visibleEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No detailed events recorded.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1">
              {visibleEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayGroup({
  group,
  defaultOpen,
}: {
  group: VisitorDayGroup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? group.isToday);
  const uniqueVisitors = new Set(group.sessions.map((s) => s.visitorId)).size;
  const pageViews = group.sessions.reduce((sum, s) => sum + s.pageViewCount, 0);
  const online = group.sessions.filter(isOnline).length;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-base font-semibold">{group.dateLabel}</p>
          <Badge variant="secondary" className="text-xs">
            {uniqueVisitors} visitor{uniqueVisitors === 1 ? "" : "s"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"} · {pageViews}{" "}
            page views
          </span>
          {online > 0 && (
            <Badge className="bg-green-600 text-xs hover:bg-green-600">{online} online</Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t bg-muted/10 p-3">
          {group.sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VisitorAnalyticsClient() {
  const { user } = useAuth();
  const [data, setData] = useState<VisitorAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const role = user?.role ?? "super_admin";
      const res = await fetch(`/api/admin/visitor-analytics?actorRole=${encodeURIComponent(role)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load visitor analytics");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const stats = data?.stats;
  const clarityUrl = getClarityDashboardUrl();

  const subtitle = useMemo(() => {
    if (!data) return "Track visitors, searches, clicks, sources, and exit pages";
    return `${data.totalSessions} sessions tracked · refreshes every minute`;
  }, [data]);

  return (
    <>
      <AdminHeader
        title="Visitor Analytics"
        description={subtitle}
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-3xl text-xs text-muted-foreground sm:text-sm">
            Visitor sessions by day (IST). For heatmaps, session recordings, and scroll maps, use
            Microsoft Clarity.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {clarityUrl ? (
              <a
                href={clarityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Microsoft Clarity
              </a>
            ) : (
              <Button variant="outline" size="sm" disabled title="Set NEXT_PUBLIC_CLARITY_ID in env">
                Clarity not configured
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {clarityUrl && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
            <span>
              <strong>Microsoft Clarity</strong> connected
              {CLARITY_PROJECT_ID ? ` · Project ${CLARITY_PROJECT_ID}` : ""} — view clicks, rage
              clicks, recordings &amp; funnels in detail.
            </span>
            <a
              href={clarityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              Go to Clarity dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading visitor data...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                compact
                title="Visitors Today"
                value={String(stats?.visitorsToday ?? 0)}
                change={`Yesterday: ${stats?.visitorsYesterday ?? 0}`}
                changeType="neutral"
                icon={Users}
              />
              <MetricCard
                compact
                title="Online Now"
                value={String(stats?.onlineNow ?? 0)}
                change="Last 2 min"
                changeType="neutral"
                icon={Activity}
              />
              <MetricCard
                compact
                title="Page Views"
                value={String(stats?.pageViewsToday ?? 0)}
                change="Today"
                changeType="neutral"
                icon={Eye}
              />
              <MetricCard
                compact
                title="Avg. Time"
                value={formatDuration(stats?.avgDurationTodaySec ?? 0)}
                change="Per session"
                changeType="neutral"
                icon={Clock}
              />
              <MetricCard
                compact
                title="Top Source"
                value={stats?.topSourceToday ?? "—"}
                change="Today"
                changeType="neutral"
                icon={Globe}
              />
              <MetricCard
                compact
                title="Top Exit"
                value={stats?.topExitPageToday ?? "—"}
                change="Where left"
                changeType="neutral"
                icon={LogOut}
              />
            </div>

            {!data || data.days.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No visitor sessions yet. Browse the customer website (not /admin) to start
                  recording visits.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.days.map((group) => (
                  <DayGroup key={group.dateKey} group={group} defaultOpen={group.isToday} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
