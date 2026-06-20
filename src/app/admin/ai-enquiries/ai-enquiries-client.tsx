"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  User,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
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

function VisitorSessionCard({
  session,
  defaultOpen,
}: {
  session: AiEnquiryVisitorSession;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const summaryParts = [
    session.destination && `→ ${session.destination}`,
    session.pickupCity && `from ${session.pickupCity}`,
    session.lastStep && `left at: ${formatEnquiryStep(session.lastStep)}`,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{session.startTimeLabel}</p>
            {session.endTimeLabel !== session.startTimeLabel && (
              <span className="text-xs text-muted-foreground">→ {session.endTimeLabel}</span>
            )}
            <StatusBadge
              status={session.status === "converted" ? "success" : "pending"}
              label={session.status}
            />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {session.locationReadable}
            </span>
            {session.ip && (
              <span className="inline-flex items-center gap-1 font-mono">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                {session.ip}
              </span>
            )}
            <Badge variant="outline" className="h-5 text-[10px]">
              {session.locale === "hi" ? "Hindi" : "English"}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {session.messageCount} message{session.messageCount === 1 ? "" : "s"}
            </span>
          </div>
          {summaryParts.length > 0 && (
            <p className="text-xs font-medium text-foreground/80">{summaryParts.join(" · ")}</p>
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
        <div className="border-t bg-muted/15">
          {(session.destination ||
            session.packagePrice ||
            session.customerName ||
            session.customerPhone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-2 text-xs">
              {session.destination && (
                <span>
                  <span className="text-muted-foreground">Destination:</span> {session.destination}
                </span>
              )}
              {session.pickupCity && (
                <span>
                  <span className="text-muted-foreground">Pickup:</span> {session.pickupCity}
                </span>
              )}
              {session.tripType && (
                <span>
                  <span className="text-muted-foreground">Trip:</span> {session.tripType}
                </span>
              )}
              {session.durationDays && (
                <span>
                  <span className="text-muted-foreground">Days:</span> {session.durationDays}
                </span>
              )}
              {session.selectedTierId && (
                <span>
                  <span className="text-muted-foreground">Tier:</span> {session.selectedTierId}
                </span>
              )}
              {session.packagePrice != null && session.packagePrice > 0 && (
                <span>
                  <span className="text-muted-foreground">Quote:</span>{" "}
                  {formatCurrency(session.packagePrice, "en")}
                </span>
              )}
              {session.lastStep && (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  Stopped at: {formatEnquiryStep(session.lastStep)}
                </span>
              )}
            </div>
          )}

          {(session.customerName || session.customerPhone || session.customerEmail) && (
            <div className="flex flex-wrap gap-4 border-b px-4 py-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium">
                <User className="h-3.5 w-3.5" />
                Customer
              </span>
              {session.customerName && <span>{session.customerName}</span>}
              {session.customerPhone && <span>{session.customerPhone}</span>}
              {session.customerEmail && <span>{session.customerEmail}</span>}
            </div>
          )}

          <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto p-4">
            {session.chat.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-background border shadow-sm"
                )}
              >
                <p className="mb-1 text-[10px] font-medium opacity-70">
                  {msg.role === "user" ? "Customer" : "Safar Sathi AI"} · {msg.timeLabel}
                </p>
                {msg.content}
              </div>
            ))}
          </div>
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
      const res = await fetch("/api/admin/ai-enquiries");
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

  return (
    <>
      <AdminHeader
        title="AI Assistant Enquiries"
        description="Full customer chats — grouped by visitor with location, IP and where they stopped"
        adminName={user?.name ?? "Admin"}
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {sessions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {sessions.length} visitor session{sessions.length === 1 ? "" : "s"} ·{" "}
              {enquiries.length} total messages
            </p>
          )}
          {loadSource === "client" && enquiries.length > 0 && (
            <p className="text-xs text-muted-foreground">Loaded via staff Firebase session</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
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
          <div className="flex items-center justify-center py-16 text-muted-foreground">
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
            {sessions.map((session, index) => (
              <VisitorSessionCard key={session.id} session={session} defaultOpen={index === 0} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
