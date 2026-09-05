"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Bot,
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  Laptop,
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
import { adminApiFetch } from "@/lib/admin/api-client";
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
  VisitorUserGroup,
} from "@/types/visitor-analytics";
import { toast } from "sonner";

function isOnline(session: VisitorSession): boolean {
  return Date.now() - new Date(session.lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
}

function sessionSortTime(session: VisitorSession): string {
  return session.lastSeenAt || session.endedAt || session.startedAt;
}

function pagesVisited(session: VisitorSession): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const event of session.events) {
    if (event.type !== "page_view" || !event.path) continue;
    if (seen.has(event.path)) continue;
    seen.add(event.path);
    paths.push(event.path);
  }
  if (paths.length === 0 && session.entryPath) {
    paths.push(session.entryPath);
    if (session.exitPath && session.exitPath !== session.entryPath) {
      paths.push(session.exitPath);
    }
  }
  return paths;
}

function visitorDisplayName(session: VisitorSession): string {
  const tail =
    session.visitorId.replace(/^(v_|guest_)/, "").slice(-8) ||
    session.visitorId.slice(-6);
  const devicePart =
    session.deviceName?.trim() || `${session.browser} · ${session.device}`;
  return `${devicePart} · …${tail}`;
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs sm:grid-cols-[9rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all font-medium text-foreground/90">{value}</span>
    </div>
  );
}

function SessionCard({
  session,
  ai,
}: {
  session: VisitorSession;
  ai?: Pick<VisitorUserGroup, "aiChatSessions" | "aiMessages">;
}) {
  const [open, setOpen] = useState(false);
  const online = isOnline(session);
  const visibleEvents = session.events.filter((e) => e.type !== "heartbeat");
  const pages = pagesVisited(session);
  const staySeconds = Math.max(0, Math.round(session.durationSec || 0));

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{visitorDisplayName(session)}</p>
            {online && (
              <Badge className="h-5 bg-green-600 text-[10px] hover:bg-green-600">Online</Badge>
            )}
            {ai && ai.aiChatSessions > 0 && (
              <Badge className="h-5 bg-violet-600 text-[10px] hover:bg-violet-600">
                <Bot className="mr-1 h-3 w-3" />
                {ai.aiChatSessions} AI · {ai.aiMessages} msg
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">
              Visited {formatEventTime(session.startedAt)}
            </span>
            <span>→</span>
            <span>
              Left {formatEventTime(session.endedAt || session.lastSeenAt)}
            </span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {staySeconds}s · {formatDuration(staySeconds)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {session.source}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {session.pageViewCount} pages
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
            {session.ip && <span className="font-mono">{session.ip}</span>}
            {(session.city || session.country) && (
              <span>
                {[session.city, session.country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/80">
            Entry: {session.entryPath}
            {session.exitPath !== session.entryPath ? ` · Exit: ${session.exitPath}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t bg-muted/10 px-4 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visit timing
            </p>
            <div className="space-y-1.5 rounded-lg border bg-background/70 p-3">
              <DetailRow label="Visited at" value={formatEventTime(session.startedAt)} />
              <DetailRow
                label="Left at"
                value={formatEventTime(session.endedAt || session.lastSeenAt)}
              />
              <DetailRow label="Last seen" value={formatEventTime(session.lastSeenAt)} />
              <DetailRow
                label="Stay duration"
                value={`${staySeconds} seconds (${formatDuration(staySeconds)})`}
              />
              <DetailRow label="Status" value={online ? "Online now" : "Offline"} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Device &amp; identity
            </p>
            <div className="space-y-1.5 rounded-lg border bg-background/70 p-3">
              <DetailRow
                label="Device"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5" />
                    {session.deviceName || `${session.browser} on ${session.device}`}
                  </span>
                }
              />
              <DetailRow label="Browser" value={session.browser} />
              <DetailRow label="Device type" value={session.device} />
              <DetailRow label="Language" value={session.language} />
              <DetailRow label="Visitor ID" value={<span className="font-mono">{session.visitorId}</span>} />
              {session.deviceId && (
                <DetailRow label="Device ID" value={<span className="font-mono">{session.deviceId}</span>} />
              )}
              {session.userId && (
                <DetailRow label="User ID" value={<span className="font-mono">{session.userId}</span>} />
              )}
              <DetailRow label="IP" value={session.ip ? <span className="font-mono">{session.ip}</span> : "—"} />
              <DetailRow
                label="Location"
                value={[session.city, session.country].filter(Boolean).join(", ") || "—"}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Traffic &amp; activity
            </p>
            <div className="space-y-1.5 rounded-lg border bg-background/70 p-3">
              <DetailRow label="Source" value={session.source} />
              <DetailRow label="Referrer" value={session.referrer || "Direct / none"} />
              <DetailRow label="Entry page" value={session.entryPath} />
              <DetailRow label="Exit page" value={session.exitPath} />
              <DetailRow label="Page views" value={String(session.pageViewCount)} />
              <DetailRow label="Clicks" value={String(session.clickCount)} />
              <DetailRow label="Searches" value={String(session.searchCount)} />
              {session.utmSource && <DetailRow label="UTM source" value={session.utmSource} />}
              {session.utmMedium && <DetailRow label="UTM medium" value={session.utmMedium} />}
              {session.utmCampaign && (
                <DetailRow label="UTM campaign" value={session.utmCampaign} />
              )}
              {session.utmTerm && <DetailRow label="UTM term" value={session.utmTerm} />}
              {ai && ai.aiChatSessions > 0 && (
                <DetailRow
                  label="AI assistant"
                  value={`${ai.aiChatSessions} chat${ai.aiChatSessions === 1 ? "" : "s"} · ${ai.aiMessages} messages`}
                />
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pages visited ({pages.length})
            </p>
            {pages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No page paths recorded.</p>
            ) : (
              <ul className="space-y-1 rounded-lg border bg-background/70 p-3 text-xs">
                {pages.map((path) => (
                  <li key={path} className="break-all font-mono text-foreground/90">
                    {path}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Event timeline ({visibleEvents.length})
            </p>
            {visibleEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No detailed events recorded.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border bg-background/70 px-3">
                {visibleEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
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
  const aiUsers = group.visitorGroups.filter((g) => g.aiChatSessions > 0).length;

  const sessionsLatestFirst = useMemo(
    () =>
      [...group.sessions].sort((a, b) =>
        sessionSortTime(b).localeCompare(sessionSortTime(a))
      ),
    [group.sessions]
  );

  const aiBySessionKey = useMemo(() => {
    const map = new Map<string, Pick<VisitorUserGroup, "aiChatSessions" | "aiMessages">>();
    for (const visitorGroup of group.visitorGroups) {
      const key = `${visitorGroup.visitorId}::${visitorGroup.deviceId ?? visitorGroup.device}`;
      map.set(key, {
        aiChatSessions: visitorGroup.aiChatSessions,
        aiMessages: visitorGroup.aiMessages,
      });
    }
    return map;
  }, [group.visitorGroups]);

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
          {aiUsers > 0 && (
            <Badge className="bg-violet-600 text-xs hover:bg-violet-600">
              <Bot className="mr-1 h-3 w-3" />
              {aiUsers} AI user{aiUsers === 1 ? "" : "s"}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {group.sessions.length} visit{group.sessions.length === 1 ? "" : "s"} · {pageViews}{" "}
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
          <p className="text-xs text-muted-foreground">
            Latest activity first · click a visitor to see full details
          </p>
          {sessionsLatestFirst.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              ai={aiBySessionKey.get(
                `${session.visitorId}::${session.deviceId ?? session.device}`
              )}
            />
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
      const res = await adminApiFetch("/api/admin/visitor-analytics");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load");
      setData(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load visitor analytics");
    } finally {
      setLoading(false);
    }
  }, []);

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
            Visitors grouped by day. Within each day, latest visits appear first. Click any
            visitor to see device info, visit/leave time, stay seconds, pages, clicks, and full
            activity.
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
