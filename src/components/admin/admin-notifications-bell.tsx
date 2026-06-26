"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { AdminNotification } from "@/lib/admin/notifications";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function AdminNotificationsBell() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (authLoading || !user?.role) return;
    setLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data?.notifications ?? []);
        setUnreadCount(json.data?.unreadCount ?? 0);
      }
    } catch {
      // Ignore transient errors.
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.role]);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => void loadNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    if (!user?.role) return;
    await adminApiFetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!user?.role) return;
    await adminApiFetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const openNotification = (notification: AdminNotification) => {
    if (!notification.read) void markRead(notification.id);
    setOpen(false);
    router.push(notification.href);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void loadNotifications();
      }}
    >
      <PopoverTrigger
        aria-label="Open notifications"
        render={
          <Button variant="ghost" size="icon" className="relative h-9 w-9" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[200] w-80 max-h-[min(70vh,420px)] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[min(55vh,340px)] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 12).map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-3 text-left transition-colors hover:bg-muted/60"
                    onClick={() => openNotification(notification)}
                  >
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        !notification.read && "font-semibold text-foreground"
                      )}
                    >
                      {notification.title}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatWhen(notification.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t px-3 py-2">
          <Link
            href="/admin/bookings"
            className="block text-center text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all bookings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
