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
import {
  groupEnquiriesByDate,
  type AiAssistantEnquiry,
} from "@/types/ai-enquiry";
import { listAiEnquiriesFromClient } from "@/lib/ai/travel-manager/enquiry-client";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatDateHeading(dateKey: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00`));
  } catch {
    return dateKey;
  }
}

function EnquiryRow({ enquiry }: { enquiry: AiAssistantEnquiry }) {
  return (
    <Card className="border-muted">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{enquiry.timeLabel}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {enquiry.locationReadable}
              </span>
              {enquiry.ip && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Globe className="h-3 w-3" />
                  {enquiry.ip}
                </span>
              )}
              {enquiry.locale && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {enquiry.locale === "hi" ? "Hindi" : "English"}
                </Badge>
              )}
            </div>
          </div>
          <StatusBadge
            status={enquiry.status === "converted" ? "success" : "pending"}
            label={enquiry.status}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          {enquiry.destination && (
            <p>
              <span className="text-muted-foreground">Destination:</span> {enquiry.destination}
            </p>
          )}
          {enquiry.pickupCity && (
            <p>
              <span className="text-muted-foreground">Pickup:</span> {enquiry.pickupCity}
            </p>
          )}
          {enquiry.tripType && (
            <p>
              <span className="text-muted-foreground">Trip type:</span> {enquiry.tripType}
            </p>
          )}
          {enquiry.durationDays && (
            <p>
              <span className="text-muted-foreground">Duration:</span> {enquiry.durationDays} days
            </p>
          )}
          {enquiry.selectedTierId && (
            <p>
              <span className="text-muted-foreground">Tier:</span> {enquiry.selectedTierId}
            </p>
          )}
          {enquiry.packagePrice != null && enquiry.packagePrice > 0 && (
            <p>
              <span className="text-muted-foreground">Quote:</span>{" "}
              {formatCurrency(enquiry.packagePrice, "en")}
            </p>
          )}
          {enquiry.step && (
            <p>
              <span className="text-muted-foreground">Step:</span> {enquiry.step}
            </p>
          )}
        </div>

        {(enquiry.customerName || enquiry.customerPhone || enquiry.customerEmail) && (
          <div className="rounded-lg bg-muted/50 p-2 text-xs space-y-1">
            <p className="font-medium inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              Customer details
            </p>
            {enquiry.customerName && <p>Name: {enquiry.customerName}</p>}
            {enquiry.customerPhone && <p>Phone: {enquiry.customerPhone}</p>}
            {enquiry.customerEmail && <p>Email: {enquiry.customerEmail}</p>}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-primary/5 p-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">User</p>
            <p>{enquiry.userMessage}</p>
          </div>
          {enquiry.aiReply && (
            <div className="rounded-lg bg-muted p-2">
              <p className="text-xs font-medium text-muted-foreground mb-1 inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                AI reply
              </p>
              <p className="whitespace-pre-wrap text-xs">{enquiry.aiReply}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AiEnquiriesClient() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<AiAssistantEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});
  const [loadSource, setLoadSource] = useState<"server" | "client" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-enquiries");
      const json = await res.json();
      let items: AiAssistantEnquiry[] = [];

      if (json.success) {
        const payload = json.data;
        items = Array.isArray(payload)
          ? payload
          : (payload?.enquiries ?? []);
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
      const grouped = groupEnquiriesByDate(items);
      const firstDate = Object.keys(grouped).sort((a, b) => b.localeCompare(a))[0];
      if (firstDate) {
        setOpenDates((prev) => ({ ...prev, [firstDate]: true }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupEnquiriesByDate(enquiries), [enquiries]);
  const sortedDates = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped]
  );

  const toggleDate = (dateKey: string) => {
    setOpenDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  return (
    <>
      <AdminHeader
        title="AI Assistant Enquiries"
        description="Live chat enquiries from Safar Sathi AI — grouped by date with location & IP"
        adminName={user?.name ?? "Admin"}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {loadSource === "client" && enquiries.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Loaded from Firebase (staff session). New chats appear after customers send messages.
            </p>
          )}
          <div className="ml-auto">
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
        {loading && enquiries.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading enquiries…
          </div>
        ) : sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No AI enquiries yet. They appear when users chat with Safar Sathi AI on the website.
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((dateKey) => {
            const items = grouped[dateKey] ?? [];
            const isOpen = openDates[dateKey] ?? false;
            return (
              <div key={dateKey} className="rounded-xl border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDate(dateKey)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{formatDateHeading(dateKey)}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} enquiry{items.length === 1 ? "" : "ies"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t p-4 bg-muted/20">
                    {items.map((enquiry) => (
                      <EnquiryRow key={enquiry.id} enquiry={enquiry} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
