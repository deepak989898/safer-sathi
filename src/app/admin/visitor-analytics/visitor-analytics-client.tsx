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
  MapPin,
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
import { resolveVisitorKind } from "@/lib/visitor-analytics/visitor-kind";
import { cn } from "@/lib/utils";
import type {
  VisitorAnalyticsPayload,
  VisitorEvent,
  VisitorKind,
  VisitorSession,
  VisitorUserGroup,
} from "@/types/visitor-analytics";
import { toast } from "sonner";

type VisitorKindFilter = "all" | VisitorKind;

function isOnline(session: VisitorSession): boolean {
  return Date.now() - new Date(session.lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
}

function sessionSortTime(session: VisitorSession): string {
  return session.lastSeenAt || session.endedAt || session.startedAt;
}

function dateKeyOf(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateHeading(dateKey: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const label = new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (dateKey === today) return `Today · ${label}`;
  if (dateKey === yesterday) return `Yesterday · ${label}`;
  return label;
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

function locationLabel(session: VisitorSession): string {
  return [session.city, session.country].filter(Boolean).join(", ") || "Location unknown";
}

function visitorTail(session: VisitorSession): string {
  return (
    session.visitorId.replace(/^(v_|guest_)/, "").slice(-8) ||
    session.visitorId.slice(-6)
  );
}

function EventRow({ event }: { event: VisitorEvent }) {
  return (
    <div className="flex flex-wrap items-start gap-2 border-b border-dashed py-2 text-xs last:border-0">
      <span className="shrink-0 font-mono text-sky-700 dark:text-sky-300">
        {formatEventTime(event.at)}
      </span>
      <Badge
        variant="outline"
        className="h-5 border-violet-200 bg-violet-50 text-[10px] text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
      >
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
      <span className="font-medium text-slate-500">{label}</span>
      <span className="min-w-0 break-all font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

/** Compact horizontal field — stacks label above value, fits in multi-column grids. */
function DetailCell({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-1.5 dark:border-slate-800 dark:bg-background/60">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-0.5 min-w-0 break-all text-xs font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  titleClassName,
  children,
}: {
  title: string;
  titleClassName: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card">
      <p className={cn("mb-2 text-[11px] font-bold uppercase tracking-wide", titleClassName)}>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {children}
    </span>
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
  const location = locationLabel(session);
  const lastActive = session.lastSeenAt || session.endedAt || session.startedAt;
  const stayLabel = formatDuration(staySeconds);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 bg-white shadow-sm dark:bg-card",
        online
          ? "border-emerald-300 dark:border-emerald-700"
          : open
            ? "border-sky-300 dark:border-sky-700"
            : "border-slate-200 dark:border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 bg-gradient-to-r from-sky-50/90 via-white to-emerald-50/70 px-4 py-3 text-left transition-colors hover:from-sky-100 hover:to-emerald-100/80 dark:from-sky-950/30 dark:via-card dark:to-emerald-950/20"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-sky-900 dark:text-sky-200">
              Last active {formatEventTime(lastActive)}
            </p>
            {online && (
              <Badge className="h-5 bg-emerald-600 text-[10px] hover:bg-emerald-600">
                Online now
              </Badge>
            )}
            {resolveVisitorKind(session) === "bot" && (
              <Badge className="h-5 bg-rose-600 text-[10px] hover:bg-rose-600">
                <Bot className="mr-1 h-3 w-3" />
                Bot
              </Badge>
            )}
            {ai && ai.aiChatSessions > 0 && (
              <Badge className="h-5 bg-violet-600 text-[10px] hover:bg-violet-600">
                <Bot className="mr-1 h-3 w-3" />
                {ai.aiChatSessions} AI · {ai.aiMessages} msg
              </Badge>
            )}
            <span className="text-[10px] font-medium text-sky-600">
              {open ? "Hide details" : "More info ▼"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-100 px-3 py-1.5 text-amber-950 shadow-sm dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100">
              <Clock className="h-5 w-5 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Stay time
                </span>
                <span className="text-xl font-black tracking-tight sm:text-2xl">
                  {stayLabel}
                </span>
                <span className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-200/80">
                  {staySeconds.toLocaleString()} seconds
                </span>
              </span>
            </span>
            <Chip className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <MapPin className="h-3 w-3" />
              {location}
            </Chip>
            {session.ip && (
              <Chip className="border-slate-200 bg-slate-50 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Globe className="h-3 w-3" />
                {session.ip}
              </Chip>
            )}
            <Chip className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
              {session.source}
            </Chip>
            <Chip className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
              <Eye className="h-3 w-3" />
              {session.pageViewCount} pages
            </Chip>
            <Chip className="border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
              <MousePointerClick className="h-3 w-3" />
              {session.clickCount} clicks
            </Chip>
            {session.searchCount > 0 && (
              <Chip className="border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                <Search className="h-3 w-3" />
                {session.searchCount} searches
              </Chip>
            )}
          </div>

          <div className="space-y-0.5 text-xs">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              <span className="text-sky-700 dark:text-sky-300">Visited</span>{" "}
              {formatEventTime(session.startedAt)}
              <span className="mx-1 text-slate-400">→</span>
              <span className="text-rose-700 dark:text-rose-300">Left</span>{" "}
              {formatEventTime(session.endedAt || session.lastSeenAt)}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-teal-700 dark:text-teal-300">Entry</span>{" "}
              {session.entryPath}
              {session.exitPath !== session.entryPath && (
                <>
                  {" · "}
                  <span className="font-semibold text-rose-700 dark:text-rose-300">Exit</span>{" "}
                  {session.exitPath}
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-500">
              Visitor …{visitorTail(session)}
              {" · "}
              {session.deviceName || `${session.browser} · ${session.device}`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-sky-600 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-sky-200 bg-slate-50/80 px-4 py-4 dark:border-sky-900 dark:bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/40">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Stay on site
                </p>
                <p className="text-3xl font-black tracking-tight text-amber-950 dark:text-amber-50 sm:text-4xl">
                  {stayLabel}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-amber-900/80 dark:text-amber-100/80">
              {staySeconds.toLocaleString()} seconds total ·{" "}
              {online ? "Online now" : "Offline"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailSection title="Visit timing" titleClassName="text-sky-800 dark:text-sky-300">
              <DetailCell label="Visited at" value={formatEventTime(session.startedAt)} />
              <DetailCell
                label="Left at"
                value={formatEventTime(session.endedAt || session.lastSeenAt)}
              />
              <DetailCell label="Last active" value={formatEventTime(lastActive)} />
              <DetailCell
                label="Stay on site"
                value={
                  <span className="text-base font-black text-amber-800 dark:text-amber-200">
                    {stayLabel}{" "}
                    <span className="text-xs font-semibold text-amber-700/80">
                      ({staySeconds.toLocaleString()}s)
                    </span>
                  </span>
                }
              />
              <DetailCell label="Status" value={online ? "Online now" : "Offline"} />
            </DetailSection>

            <DetailSection
              title="Location & identity"
              titleClassName="text-emerald-800 dark:text-emerald-300"
            >
              <DetailCell label="Location" value={location} />
              <DetailCell
                label="IP address"
                value={session.ip ? <span className="font-mono">{session.ip}</span> : "—"}
              />
              <DetailCell
                label="Visitor ID"
                value={<span className="font-mono text-[10px]">{session.visitorId}</span>}
              />
              {session.userId && (
                <DetailCell
                  label="Logged-in user"
                  value={<span className="font-mono text-[10px]">{session.userId}</span>}
                />
              )}
              <DetailCell label="Language" value={session.language || "—"} />
            </DetailSection>

            <DetailSection title="Device" titleClassName="text-indigo-800 dark:text-indigo-300">
              <DetailCell
                label="Device"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="h-3.5 w-3.5 shrink-0" />
                    {session.deviceName || `${session.browser} on ${session.device}`}
                  </span>
                }
              />
              <DetailCell label="Browser" value={session.browser} />
              <DetailCell label="Device type" value={session.device} />
              {session.deviceId && (
                <DetailCell
                  label="Device ID"
                  value={<span className="font-mono text-[10px]">{session.deviceId}</span>}
                />
              )}
            </DetailSection>

            <DetailSection
              title="Traffic & activity"
              titleClassName="text-orange-800 dark:text-orange-300"
            >
              <DetailCell label="Source" value={session.source} />
              <DetailCell label="Referrer" value={session.referrer || "Direct / none"} />
              <DetailCell label="Entry page" value={session.entryPath} />
              <DetailCell label="Exit page" value={session.exitPath} />
              <DetailCell label="Page views" value={String(session.pageViewCount)} />
              <DetailCell label="Clicks" value={String(session.clickCount)} />
              <DetailCell label="Searches" value={String(session.searchCount)} />
              {session.utmSource && <DetailCell label="UTM source" value={session.utmSource} />}
              {session.utmMedium && <DetailCell label="UTM medium" value={session.utmMedium} />}
              {session.utmCampaign && (
                <DetailCell label="UTM campaign" value={session.utmCampaign} />
              )}
              {session.utmTerm && <DetailCell label="UTM term" value={session.utmTerm} />}
              {ai && ai.aiChatSessions > 0 && (
                <DetailCell
                  label="AI assistant"
                  value={`${ai.aiChatSessions} chat${ai.aiChatSessions === 1 ? "" : "s"} · ${ai.aiMessages} messages`}
                />
              )}
            </DetailSection>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-fuchsia-200 bg-white p-3 shadow-sm dark:border-fuchsia-900 dark:bg-card">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-fuchsia-800 dark:text-fuchsia-300">
                Pages visited ({pages.length})
              </p>
              {pages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No page paths recorded.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {pages.map((path) => (
                    <li
                      key={path}
                      className="max-w-full break-all rounded-md border border-fuchsia-100 bg-fuchsia-50 px-2 py-1 font-mono text-[11px] text-fuchsia-900 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-200"
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="min-w-0 rounded-xl border border-violet-200 bg-white p-3 shadow-sm dark:border-violet-900 dark:bg-card">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                Event timeline ({visibleEvents.length})
              </p>
              {visibleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No detailed events recorded.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-violet-100 px-2 dark:border-violet-900">
                  {visibleEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

type DayGroup = {
  dateKey: string;
  label: string;
  count: number;
  sessions: Array<{
    session: VisitorSession;
    ai?: Pick<VisitorUserGroup, "aiChatSessions" | "aiMessages">;
  }>;
};

export default function VisitorAnalyticsClient() {
  const { user } = useAuth();
  const [data, setData] = useState<VisitorAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  /** Default: human only so admins see real visitors first. */
  const [kindFilter, setKindFilter] = useState<VisitorKindFilter>("human");
  /** dateKey → expanded. Today starts open; older days start collapsed. */
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

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
    const interval = window.setInterval(() => void load(), 10 * 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const clarityUrl = getClarityDashboardUrl();

  const filteredSessions = useMemo(() => {
    if (!data?.days.length) return [] as VisitorSession[];
    const all = data.days.flatMap((day) => day.sessions);
    if (kindFilter === "all") return all;
    return all.filter((session) => resolveVisitorKind(session) === kindFilter);
  }, [data, kindFilter]);

  const filterCounts = useMemo(() => {
    const all = data?.days.flatMap((day) => day.sessions) ?? [];
    let human = 0;
    let bot = 0;
    for (const session of all) {
      if (resolveVisitorKind(session) === "bot") bot += 1;
      else human += 1;
    }
    return { all: all.length, human, bot };
  }, [data]);

  const filteredStats = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);

    const todaySessions = filteredSessions.filter(
      (s) => dateKeyOf(sessionSortTime(s)) === todayKey
    );
    const yesterdaySessions = filteredSessions.filter(
      (s) => dateKeyOf(sessionSortTime(s)) === yesterdayKey
    );
    const onlineNow = filteredSessions.filter((s) => isOnline(s)).length;
    const pageViewsToday = todaySessions.reduce((sum, s) => sum + (s.pageViewCount || 0), 0);
    const avgDurationTodaySec =
      todaySessions.length > 0
        ? Math.round(
            todaySessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / todaySessions.length
          )
        : 0;

    const sourceCounts = new Map<string, number>();
    const exitCounts = new Map<string, number>();
    for (const s of todaySessions) {
      sourceCounts.set(s.source || "Direct", (sourceCounts.get(s.source || "Direct") || 0) + 1);
      if (s.exitPath) exitCounts.set(s.exitPath, (exitCounts.get(s.exitPath) || 0) + 1);
    }
    const topSourceToday =
      [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topExitPageToday =
      [...exitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      visitorsToday: new Set(todaySessions.map((s) => s.visitorId)).size,
      visitorsYesterday: new Set(yesterdaySessions.map((s) => s.visitorId)).size,
      onlineNow,
      pageViewsToday,
      avgDurationTodaySec,
      topSourceToday,
      topExitPageToday,
    };
  }, [filteredSessions]);

  const dayGroups = useMemo((): DayGroup[] => {
    if (!data?.days.length) return [];

    const aiLookup = new Map<string, Pick<VisitorUserGroup, "aiChatSessions" | "aiMessages">>();
    for (const day of data.days) {
      for (const group of day.visitorGroups) {
        aiLookup.set(`${group.visitorId}::${group.deviceId ?? group.device}`, {
          aiChatSessions: group.aiChatSessions,
          aiMessages: group.aiMessages,
        });
      }
    }

    const allSessions = [...filteredSessions].sort((a, b) =>
      sessionSortTime(b).localeCompare(sessionSortTime(a))
    );

    const groups: DayGroup[] = [];
    const indexByKey = new Map<string, number>();

    for (const session of allSessions) {
      const key = dateKeyOf(sessionSortTime(session));
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = groups.length;
        indexByKey.set(key, idx);
        groups.push({
          dateKey: key,
          label: formatDateHeading(key),
          count: 0,
          sessions: [],
        });
      }
      groups[idx].sessions.push({
        session,
        ai: aiLookup.get(`${session.visitorId}::${session.deviceId ?? session.device}`),
      });
      groups[idx].count = groups[idx].sessions.length;
    }

    return groups;
  }, [data, filteredSessions]);

  useEffect(() => {
    if (!dayGroups.length) return;
    const today = new Date().toISOString().slice(0, 10);
    setExpandedDays((prev) => {
      const next = { ...prev };
      for (const group of dayGroups) {
        if (next[group.dateKey] === undefined) {
          next[group.dateKey] = group.dateKey === today;
        }
      }
      return next;
    });
  }, [dayGroups]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const subtitle = useMemo(() => {
    if (!data) return "Recently active visitors first — stay time, location, and full details";
    const filterLabel =
      kindFilter === "human" ? "humans" : kindFilter === "bot" ? "bots" : "all";
    return `${filteredSessions.length} ${filterLabel} · ${data.totalSessions} total · refreshes every 10 min`;
  }, [data, filteredSessions.length, kindFilter]);

  const stats = filteredStats;

  const kindFilters: Array<{ id: VisitorKindFilter; label: string; count: number }> = [
    { id: "human", label: "Human", count: filterCounts.human },
    { id: "bot", label: "Bot", count: filterCounts.bot },
    { id: "all", label: "All", count: filterCounts.all },
  ];

  return (
    <>
      <AdminHeader
        title="Visitor Analytics"
        description={subtitle}
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-3 dark:border-sky-900 dark:from-sky-950/30 dark:via-background dark:to-emerald-950/20">
          <div className="space-y-2">
            <p className="max-w-3xl text-sm font-medium text-slate-700 dark:text-slate-200">
              Visitors grouped by <span className="font-bold text-sky-700">date</span> (Today,
              Yesterday, earlier). Expand a day to see visitors — then open a row for full
              details.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Show
              </span>
              {kindFilters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKindFilter(item.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                    kindFilter === item.id
                      ? item.id === "bot"
                        ? "bg-rose-600 text-white"
                        : item.id === "human"
                          ? "bg-emerald-600 text-white"
                          : "bg-sky-700 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-card dark:text-slate-200 dark:ring-border"
                  )}
                >
                  {item.label}
                  <span className="ml-1 opacity-80">({item.count})</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Stay time</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                Location
              </span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-800">Source</span>
              <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-800">
                Pages
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800">Clicks</span>
            </div>
          </div>
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
            <Button
              variant="outline"
              size="sm"
              className="border-sky-300 text-sky-800"
              onClick={() => void load()}
              disabled={loading}
            >
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
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-sky-700">
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

            {dayGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {filterCounts.all === 0
                    ? "No visitor sessions yet. Browse the customer website (not /admin) to start recording visits."
                    : kindFilter === "human"
                      ? "No human visitors in this list. Switch to Bot or All to see other traffic."
                      : kindFilter === "bot"
                        ? "No bot sessions detected in this list. Switch to Human or All."
                        : "No visitor sessions match this filter."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dayGroups.map((group) => {
                  const open = Boolean(expandedDays[group.dateKey]);
                  return (
                    <div
                      key={group.dateKey}
                      className="overflow-hidden rounded-xl border border-sky-200 bg-white dark:border-sky-900 dark:bg-sky-950/20"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDay(group.dateKey)}
                        aria-expanded={open}
                        className="flex w-full flex-wrap items-center gap-2 bg-sky-100/95 px-3 py-2.5 text-left transition hover:bg-sky-200/80 dark:bg-sky-950/90 dark:hover:bg-sky-900/80"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-sky-700 transition-transform dark:text-sky-300",
                            open ? "rotate-0" : "-rotate-90"
                          )}
                        />
                        <Calendar className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                        <p className="text-sm font-bold text-sky-900 dark:text-sky-100">
                          {group.label}
                        </p>
                        <Badge className="border-0 bg-sky-700 text-[10px] text-white hover:bg-sky-700">
                          {group.count} visit{group.count === 1 ? "" : "s"}
                        </Badge>
                        <span className="ml-auto text-[11px] font-medium text-sky-700/80 dark:text-sky-300/80">
                          {open ? "Hide visitors" : "Show visitors"}
                        </span>
                      </button>

                      {open ? (
                        <div className="space-y-3 border-t border-sky-100 bg-slate-50/60 p-3 dark:border-sky-900 dark:bg-background/40">
                          {group.sessions.map(({ session, ai }) => (
                            <SessionCard key={session.id} session={session} ai={ai} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
