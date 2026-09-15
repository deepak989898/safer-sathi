"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  detectDeviceName,
  getOrCreateDeviceId,
  getOrCreateVisitorId,
} from "@/lib/identity/visitor-identity";
import { SESSION_IDLE_MS } from "@/lib/visitor-analytics/constants";
import type { VisitorEventType } from "@/types/visitor-analytics";

const SESSION_ID_KEY = "ss_visit_session_id";
const SESSION_AT_KEY = "ss_visit_session_at";
const LAST_HEARTBEAT_KEY = "ss_visit_heartbeat_at";
/** Heartbeats only — keep page_view / exit. Clicks were flooding Firestore writes/reads. */
const HEARTBEAT_INTERVAL_MS = 120_000;
const HEARTBEAT_MIN_GAP_MS = 100_000;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const stored = sessionStorage.getItem(SESSION_ID_KEY);
  const storedAt = Number(sessionStorage.getItem(SESSION_AT_KEY) || 0);
  if (stored && now - storedAt < SESSION_IDLE_MS) {
    sessionStorage.setItem(SESSION_AT_KEY, String(now));
    return stored;
  }
  const id = `vs_${now}_${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem(SESSION_ID_KEY, id);
  sessionStorage.setItem(SESSION_AT_KEY, String(now));
  return id;
}

function touchSession() {
  sessionStorage.setItem(SESSION_AT_KEY, String(Date.now()));
}

function sessionMeta() {
  const params = new URLSearchParams(window.location.search);
  const userAgent = navigator.userAgent;
  return {
    referrer: document.referrer || "",
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    userAgent,
    language: navigator.language,
    screenWidth: window.innerWidth,
    deviceId: getOrCreateDeviceId(),
    deviceName: detectDeviceName(userAgent),
  };
}

async function sendEvent(
  type: VisitorEventType,
  extra: {
    path: string;
    title?: string;
    label?: string;
    target?: string;
    searchQuery?: string;
  },
  includeMeta = false,
  userId?: string
) {
  if (extra.path.startsWith("/admin")) return;

  if (type === "heartbeat") {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const last = Number(sessionStorage.getItem(LAST_HEARTBEAT_KEY) || 0);
    if (Date.now() - last < HEARTBEAT_MIN_GAP_MS) return;
    sessionStorage.setItem(LAST_HEARTBEAT_KEY, String(Date.now()));
  }

  const payload = {
    sessionId: getSessionId(),
    visitorId: getOrCreateVisitorId(),
    ...(userId ? { userId } : {}),
    event: {
      type,
      at: new Date().toISOString(),
      ...extra,
    },
    ...(includeMeta ? { sessionMeta: sessionMeta() } : {}),
  };

  touchSession();

  try {
    await fetch("/api/analytics/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: type === "exit",
    });
  } catch {
    // non-blocking
  }
}

function isSearchInput(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    const type = el.type?.toLowerCase();
    if (type === "search") return true;
    const name = (el.name || el.id || "").toLowerCase();
    return name.includes("search") || name.includes("query") || name.includes("q");
  }
  return false;
}

export function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const firstPageRef = useRef(true);
  const searchTimers = useRef<Map<Element, ReturnType<typeof setTimeout>>>(new Map());
  const userId = user?.role === "customer" ? user.id : undefined;

  const currentPath = useCallback(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname || "/";
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    void sendEvent(
      "page_view",
      {
        path: currentPath(),
        title: document.title,
      },
      firstPageRef.current,
      userId
    );
    firstPageRef.current = false;
  }, [pathname, searchParams, currentPath, userId]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const onSearchInput = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!isSearchInput(el)) return;
      const input = el as HTMLInputElement;
      const existing = searchTimers.current.get(el);
      if (existing) clearTimeout(existing);
      searchTimers.current.set(
        el,
        setTimeout(() => {
          const q = input.value.trim();
          if (q.length < 2) return;
          void sendEvent(
            "search",
            {
              path: currentPath(),
              title: document.title,
              searchQuery: q,
              label: q,
            },
            false,
            userId
          );
        }, 1200)
      );
    };

    const onExit = () => {
      void sendEvent(
        "exit",
        {
          path: currentPath(),
          title: document.title,
          label: "Session ended",
        },
        false,
        userId
      );
    };

    document.addEventListener("input", onSearchInput, true);
    window.addEventListener("pagehide", onExit);
    window.addEventListener("beforeunload", onExit);

    const heartbeat = window.setInterval(() => {
      void sendEvent("heartbeat", { path: currentPath(), title: document.title }, false, userId);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener("input", onSearchInput, true);
      window.removeEventListener("pagehide", onExit);
      window.removeEventListener("beforeunload", onExit);
      window.clearInterval(heartbeat);
      for (const timer of searchTimers.current.values()) clearTimeout(timer);
      searchTimers.current.clear();
    };
  }, [pathname, currentPath, userId]);

  return null;
}
