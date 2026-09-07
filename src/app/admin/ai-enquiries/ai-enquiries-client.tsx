"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Route,
  User,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch } from "@/lib/admin/api-client";
import { listAiEnquiriesFromClient } from "@/lib/ai/travel-manager/enquiry-client";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  formatEnquiryStep,
  groupEnquiriesIntoVisitorSessions,
  type AiAssistantEnquiry,
  type AiEnquiryVisitorSession,
} from "@/types/ai-enquiry";
import { toast } from "sonner";

function statusStyles(status: AiEnquiryVisitorSession["status"]) {
  if (status === "converted") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700";
  }
  if (status === "abandoned") {
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  }
  return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700";
}

function MetaChip({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className
      )}
      title={`${label}: ${value}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate">
        <span className="opacity-70">{label} </span>
        {value}
      </span>
    </span>
  );
}

function VisitorSessionCard({ session }: { session: AiEnquiryVisitorSession }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 bg-white shadow-sm dark:bg-card",
        open ? "border-violet-300 dark:border-violet-700" : "border-slate-200 dark:border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 bg-gradient-to-r from-sky-50/80 via-white to-violet-50/70 px-4 py-3 text-left transition-colors hover:from-sky-100/90 hover:to-violet-100/80 dark:from-sky-950/30 dark:via-card dark:to-violet-950/20"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-sky-800 dark:text-sky-300">
              {session.startTimeLabel}
            </p>
            {session.endTimeLabel !== session.startTimeLabel && (
              <span className="text-xs font-medium text-slate-500">
                → <span className="text-indigo-700 dark:text-indigo-300">{session.endTimeLabel}</span>
              </span>
            )}
            <Badge
              variant="outline"
              className={cn("h-5 capitalize text-[10px]", statusStyles(session.status))}
            >
              {session.status}
            </Badge>
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-300">
              {open ? "Hide chat ▲" : "Open chat ▼"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <MetaChip
              icon={MapPin}
              label="Location"
              value={session.locationReadable}
              className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            />
            {session.ip && (
              <MetaChip
                icon={Globe}
                label="IP"
                value={session.ip}
                className="border-slate-200 bg-slate-50 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              />
            )}
            <MetaChip
              icon={MessageSquare}
              label="Msgs"
              value={String(session.messageCount)}
              className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
            />
            <Badge
              variant="outline"
              className="h-6 border-cyan-200 bg-cyan-50 text-[10px] text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
            >
              {session.locale === "hi" ? "हिन्दी" : "English"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
            {session.destination && (
              <span className="text-orange-700 dark:text-orange-300">
                Destination: {session.destination}
              </span>
            )}
            {session.pickupCity && (
              <span className="text-blue-700 dark:text-blue-300">
                From: {session.pickupCity}
              </span>
            )}
            {session.lastStep && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Route className="h-3 w-3" />
                Stopped: {formatEnquiryStep(session.lastStep)}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-violet-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-violet-200 bg-slate-50/80 dark:border-violet-900 dark:bg-muted/20">
          {(session.destination ||
            session.packagePrice ||
            session.customerName ||
            session.customerPhone ||
            session.tripType ||
            session.durationDays ||
            session.selectedTierId) && (
            <div className="flex flex-wrap gap-2 border-b border-dashed border-slate-200 px-4 py-3 dark:border-border">
              {session.destination && (
                <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-300">
                  Destination: {session.destination}
                </span>
              )}
              {session.pickupCity && (
                <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  Pickup: {session.pickupCity}
                </span>
              )}
              {session.tripType && (
                <span className="rounded-md bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-800 dark:bg-pink-950/50 dark:text-pink-300">
                  Trip: {session.tripType}
                </span>
              )}
              {session.durationDays && (
                <span className="rounded-md bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
                  Days: {session.durationDays}
                </span>
              )}
              {session.selectedTierId && (
                <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                  Tier: {session.selectedTierId}
                </span>
              )}
              {session.packagePrice != null && session.packagePrice > 0 && (
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Quote: {formatCurrency(session.packagePrice, "en")}
                </span>
              )}
              {session.lastStep && (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  Stopped at: {formatEnquiryStep(session.lastStep)}
                </span>
              )}
            </div>
          )}

          {(session.customerName || session.customerPhone || session.customerEmail) && (
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-fuchsia-50/70 px-4 py-2 text-xs dark:border-border dark:bg-fuchsia-950/20">
              <span className="inline-flex items-center gap-1 font-bold text-fuchsia-800 dark:text-fuchsia-300">
                <User className="h-3.5 w-3.5" />
                Customer
              </span>
              {session.customerName && (
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {session.customerName}
                </span>
              )}
              {session.customerPhone && (
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {session.customerPhone}
                </span>
              )}
              {session.customerEmail && (
                <span className="font-medium text-teal-700 dark:text-teal-300">
                  {session.customerEmail}
                </span>
              )}
            </div>
          )}

          <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto p-4">
            {session.chat.map((msg) => {
              const isCustomer = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={cn("flex w-full", isCustomer ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                      isCustomer
                        ? "bg-sky-600 text-white"
                        : "border border-violet-200 bg-white text-slate-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-50"
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 text-[10px] font-semibold",
                        isCustomer
                          ? "text-left text-sky-100"
                          : "text-right text-violet-600 dark:text-violet-300"
                      )}
                    >
                      {isCustomer ? "Customer" : "Safar Sathi AI"} · {msg.timeLabel}
                    </p>
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface DateSessionGroup {
  dateKey: string;
  dateLabel: string;
  sessions: AiEnquiryVisitorSession[];
  isToday: boolean;
  isYesterday: boolean;
}

function groupSessionsByDate(sessions: AiEnquiryVisitorSession[]): DateSessionGroup[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const groups = new Map<string, DateSessionGroup>();

  for (const session of sessions) {
    const dateKey = session.startedAt.slice(0, 10);
    const dateLabel = new Date(session.startedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const existing = groups.get(dateKey);
    if (existing) {
      existing.sessions.push(session);
    } else {
      groups.set(dateKey, {
        dateKey,
        dateLabel,
        sessions: [session],
        isToday: dateKey === todayKey,
        isYesterday: dateKey === yesterdayKey,
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function DateEnquiryGroup({
  group,
  defaultOpen,
}: {
  group: DateSessionGroup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? group.isToday);
  const totalMessages = group.sessions.reduce((sum, s) => sum + s.messageCount, 0);
  const converted = group.sessions.filter((s) => s.status === "converted").length;
  const active = group.sessions.filter((s) => s.status === "active").length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 shadow-sm",
        group.isToday
          ? "border-sky-300 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20"
          : group.isYesterday
            ? "border-indigo-200 bg-indigo-50/30 dark:border-indigo-900 dark:bg-indigo-950/20"
            : "border-slate-200 bg-white dark:border-border dark:bg-card"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors",
          group.isToday
            ? "bg-gradient-to-r from-sky-100 to-cyan-50 hover:from-sky-200/80 hover:to-cyan-100 dark:from-sky-950/50 dark:to-cyan-950/30"
            : "hover:bg-muted/40"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg",
              group.isToday
                ? "bg-sky-600 text-white"
                : group.isYesterday
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700 text-white"
            )}
          >
            <Calendar className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-base font-bold",
                group.isToday
                  ? "text-sky-900 dark:text-sky-200"
                  : group.isYesterday
                    ? "text-indigo-900 dark:text-indigo-200"
                    : "text-slate-800 dark:text-slate-100"
              )}
            >
              {group.isToday ? "Today · " : group.isYesterday ? "Yesterday · " : ""}
              {group.dateLabel}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {open ? "Click to collapse day" : "Click to expand day chats"}
            </p>
          </div>
          <Badge className="border-0 bg-violet-600 text-xs text-white hover:bg-violet-600">
            {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="outline"
            className="border-fuchsia-200 bg-fuchsia-50 text-xs text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
          >
            {totalMessages} msgs
          </Badge>
          {active > 0 && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-100 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {active} active
            </Badge>
          )}
          {converted > 0 && (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-100 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {converted} converted
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 transition-transform",
            group.isToday ? "text-sky-700" : "text-slate-500",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-sky-200/70 bg-white/70 p-3 dark:border-border dark:bg-background/40">
          <p className="px-1 text-[11px] font-medium text-slate-500">
            Latest chats first · open a session to read the full conversation
          </p>
          {group.sessions.map((session) => (
            <VisitorSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiEnquiriesClient() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<AiAssistantEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadSource, setLoadSource] = useState<"server" | "client" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-enquiries");
      const json = await res.json();
      let items: AiAssistantEnquiry[] = [];

      if (json.success) {
        const payload = json.data;
        items = Array.isArray(payload) ? payload : (payload?.enquiries ?? []);
      } else {
        toast.error(json.error ?? "Failed to load AI enquiries");
      }

      if (items.length === 0) {
        const clientItems = await listAiEnquiriesFromClient(300);
        if (clientItems.length > 0) {
          items = clientItems;
          setLoadSource("client");
        } else {
          setLoadSource(null);
        }
      } else {
        setLoadSource("server");
      }

      setEnquiries(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sessions = useMemo(
    () => groupEnquiriesIntoVisitorSessions(enquiries),
    [enquiries]
  );

  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions]);
  const totalCustomerMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

  return (
    <>
      <AdminHeader
        title="AI Assistant Enquiries"
        description="Color-coded chats by day — expand a date, then open a visitor to read the full conversation"
        adminName={user?.name ?? "Admin"}
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-3 dark:border-sky-900 dark:from-sky-950/30 dark:via-background dark:to-violet-950/20">
          <div className="space-y-2">
            {sessions.length > 0 && (
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                <span className="text-sky-700 dark:text-sky-300">{sessions.length}</span> sessions ·{" "}
                <span className="text-indigo-700 dark:text-indigo-300">
                  {sessionsByDate.length}
                </span>{" "}
                days ·{" "}
                <span className="text-fuchsia-700 dark:text-fuchsia-300">
                  {totalCustomerMessages}
                </span>{" "}
                customer messages
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                Location
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">IP</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-800">
                Destination
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                Stopped at
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">
                Messages
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">
                Customer chat
              </span>
            </div>
            {loadSource === "client" && enquiries.length > 0 && (
              <p className="text-xs text-slate-500">Loaded via staff Firebase session</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-sky-300 text-sky-800 hover:bg-sky-50"
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

        {loading && enquiries.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sky-700">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading enquiries…
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No AI enquiries yet. They appear when users chat with Safar Sathi AI on the website.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessionsByDate.map((group) => (
              <DateEnquiryGroup
                key={group.dateKey}
                group={group}
                defaultOpen={group.isToday}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
