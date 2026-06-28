"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Gift,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  ScrollText,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApiFetch } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  formatEnquiryStep,
  type AiEnquiryVisitorSession,
} from "@/types/ai-enquiry";
import type { CustomerProfileDetail } from "@/lib/admin/customer-insights";
import { toast } from "sonner";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function AiChatSessionCard({ session }: { session: AiEnquiryVisitorSession }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {session.startTimeLabel}
            {session.endTimeLabel !== session.startTimeLabel && (
              <span className="ml-2 text-xs text-muted-foreground">
                → {session.endTimeLabel}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.messageCount} messages · {session.locationReadable}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="max-h-64 space-y-2 overflow-y-auto border-t bg-muted/20 p-3">
          {session.chat.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-4 bg-primary/10"
                  : "mr-4 bg-background border"
              )}
            >
              <p className="text-[10px] text-muted-foreground">{msg.timeLabel}</p>
              <p className="mt-0.5 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerProfileDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfileDetail | null>(null);

  const loadProfile = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/api/admin/customers/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setProfile(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load profile");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (open && userId) {
      void loadProfile(userId);
    }
    if (!open) {
      setProfile(null);
    }
  }, [open, userId, loadProfile]);

  const user = profile?.user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user ? user.name : "Customer Profile"}
          </DialogTitle>
        </DialogHeader>

        {loading || !profile ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4">
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{profile.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{profile.user.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined website</p>
                <p className="text-sm font-medium">{formatDateTime(profile.user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First booking</p>
                <p className="text-sm font-medium">
                  {profile.stats.firstBookingAt
                    ? formatDateTime(profile.stats.firstBookingAt)
                    : "No booking yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Website visits</p>
                <p className="text-sm font-medium">{profile.stats.visitCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Segment</p>
                <StatusBadge status={profile.user.segment ?? "regular"} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reward points</p>
                <p className="text-sm font-medium">
                  {profile.rewards.rewardPoints} pts
                  <span className="ml-1 text-xs text-muted-foreground">
                    (lifetime {profile.rewards.lifetimeRewardPoints})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total spent</p>
                <p className="text-sm font-medium">
                  {profile.stats.totalSpent > 0
                    ? formatCurrency(profile.stats.totalSpent)
                    : "—"}
                </p>
              </div>
            </div>

            <Tabs defaultValue="bookings">
              <TabsList className="flex h-auto flex-wrap gap-1">
                <TabsTrigger value="bookings">
                  Bookings ({profile.bookings.length})
                </TabsTrigger>
                <TabsTrigger value="rewards">
                  Rewards ({profile.rewards.transactions.length})
                </TabsTrigger>
                <TabsTrigger value="ai-chat">
                  AI Chat ({profile.aiChatSessions.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  Activity ({profile.activity.length})
                </TabsTrigger>
                <TabsTrigger value="visits">
                  Visits ({profile.visitorSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="mt-3 space-y-2">
                {profile.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  profile.bookings.map((booking) => (
                    <div key={booking.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{booking.bookingNumber}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {booking.serviceName?.en ?? booking.serviceType} ·{" "}
                        {formatCurrency(booking.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Booked {formatDateTime(booking.createdAt)} · {booking.paymentStatus}
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="rewards" className="mt-3 space-y-2">
                {profile.rewards.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reward transactions.</p>
                ) : (
                  profile.rewards.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(tx.createdAt)}
                          {tx.note ? ` · ${tx.note}` : tx.bookingNumber ? ` · ${tx.bookingNumber}` : ""}
                        </p>
                      </div>
                      <Badge variant={tx.points > 0 ? "secondary" : "outline"}>
                        {tx.points > 0 ? "+" : ""}
                        {tx.points} pts
                      </Badge>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="ai-chat" className="mt-3 space-y-2">
                {profile.aiChatSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No AI assistant chat history linked to this customer.
                  </p>
                ) : (
                  profile.aiChatSessions.map((session) => (
                    <AiChatSessionCard key={session.id} session={session} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-3 space-y-2 max-h-[360px] overflow-y-auto">
                {profile.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  profile.activity.map((event) => (
                    <div key={event.id} className="flex gap-3 rounded-lg border p-3 text-sm">
                      <div className="mt-0.5 text-muted-foreground">
                        {event.type === "booking" && <Calendar className="h-4 w-4" />}
                        {event.type === "reward" && <Gift className="h-4 w-4" />}
                        {event.type === "ai_chat" && <MessageSquare className="h-4 w-4" />}
                        {(event.type === "visit_start" ||
                          event.type === "visit_end" ||
                          event.type === "page_view") && <Globe className="h-4 w-4" />}
                        {event.type === "search" && <ScrollText className="h-4 w-4" />}
                        {event.type === "click" && <MapPin className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{event.title}</p>
                        {event.detail && (
                          <p className="text-xs text-muted-foreground">{event.detail}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDateTime(event.at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="visits" className="mt-3 space-y-2">
                {profile.visitorSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No website visits linked yet. Visits are tracked when the customer uses the
                    site (linked via device or AI chat).
                  </p>
                ) : (
                  profile.visitorSessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">
                        {formatDateTime(session.startedAt)}
                        {session.endedAt !== session.startedAt && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            → {formatDateTime(session.endedAt)}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.pageViewCount} pages · {session.clickCount} clicks ·{" "}
                        {Math.round(session.durationSec / 60)} min · {session.device}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entry: {session.entryPath} · Exit: {session.exitPath}
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
