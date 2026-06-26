import { listAiAssistantEnquiries } from "@/lib/ai/travel-manager/enquiry-service";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  MAX_EVENTS_PER_SESSION,
  ONLINE_THRESHOLD_MS,
  VISITOR_SESSIONS_COLLECTION,
} from "@/lib/visitor-analytics/constants";
import { parseDevice, parseTrafficSource } from "@/lib/visitor-analytics/format";
import {
  buildAiStatsByIdentity,
  groupSessionsByVisitor,
} from "@/lib/visitor-analytics/visitor-groups";
import type {
  VisitorAnalyticsPayload,
  VisitorAnalyticsStats,
  VisitorDayGroup,
  VisitorEvent,
  VisitorEventType,
  VisitorSession,
} from "@/types/visitor-analytics";

export interface TrackVisitorEventInput {
  sessionId: string;
  visitorId: string;
  event: {
    type: VisitorEventType;
    at: string;
    path: string;
    title?: string;
    label?: string;
    target?: string;
    searchQuery?: string;
  };
  sessionMeta?: {
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    userAgent?: string;
    language?: string;
    screenWidth?: number;
    deviceId?: string;
    deviceName?: string;
  };
  ip?: string;
  country?: string;
  city?: string;
}

let memorySessions: VisitorSession[] = [];

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function durationBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 1000));
}

function buildEvent(input: TrackVisitorEventInput["event"]): VisitorEvent {
  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    at: input.at,
    path: input.path,
    title: input.title,
    label: input.label,
    target: input.target,
    searchQuery: input.searchQuery,
  };
}

function createSession(input: TrackVisitorEventInput, event: VisitorEvent): VisitorSession {
  const ua = input.sessionMeta?.userAgent ?? "";
  const { device, browser } = parseDevice(ua);
  const referrer = input.sessionMeta?.referrer ?? "";
  const source = parseTrafficSource(
    referrer,
    input.sessionMeta?.utmSource,
    input.sessionMeta?.utmMedium
  );

  return {
    id: input.sessionId,
    visitorId: input.visitorId,
    startedAt: event.at,
    endedAt: event.at,
    lastSeenAt: event.at,
    durationSec: 0,
    entryPath: event.path,
    exitPath: event.path,
    referrer,
    source,
    utmSource: input.sessionMeta?.utmSource,
    utmMedium: input.sessionMeta?.utmMedium,
    utmCampaign: input.sessionMeta?.utmCampaign,
    utmTerm: input.sessionMeta?.utmTerm,
    device,
    browser,
    deviceId: input.sessionMeta?.deviceId,
    deviceName: input.sessionMeta?.deviceName,
    language: input.sessionMeta?.language ?? "en",
    ip: input.ip,
    country: input.country,
    city: input.city,
    pageViewCount: event.type === "page_view" ? 1 : 0,
    clickCount: event.type === "click" ? 1 : 0,
    searchCount: event.type === "search" ? 1 : 0,
    events: [event],
  };
}

function mergeEvent(session: VisitorSession, event: VisitorEvent): VisitorSession {
  const events = [...session.events, event].slice(-MAX_EVENTS_PER_SESSION);
  return {
    ...session,
    endedAt: event.at,
    lastSeenAt: event.at,
    exitPath: event.path,
    durationSec: durationBetween(session.startedAt, event.at),
    pageViewCount: session.pageViewCount + (event.type === "page_view" ? 1 : 0),
    clickCount: session.clickCount + (event.type === "click" ? 1 : 0),
    searchCount: session.searchCount + (event.type === "search" ? 1 : 0),
    events,
  };
}

function upsertMemory(session: VisitorSession) {
  const idx = memorySessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) memorySessions[idx] = session;
  else memorySessions = [session, ...memorySessions].slice(0, 1000);
}

export async function trackVisitorEvent(input: TrackVisitorEventInput): Promise<void> {
  const event = buildEvent(input.event);

  const shouldSkipHeartbeat = (session: VisitorSession | undefined) => {
    if (!session || input.event.type !== "heartbeat") return false;
    const last = session.events[session.events.length - 1];
    return (
      last?.type === "heartbeat" &&
      Date.now() - new Date(last.at).getTime() < 25_000
    );
  };

  if (!isAdminEnvConfigured()) {
    const existing = memorySessions.find((s) => s.id === input.sessionId);
    if (shouldSkipHeartbeat(existing)) return;
    const next = existing ? mergeEvent(existing, event) : createSession(input, event);
    upsertMemory(next);
    return;
  }

  const db = await getSafeAdminDb();
  if (!db) {
    const existing = memorySessions.find((s) => s.id === input.sessionId);
    if (shouldSkipHeartbeat(existing)) return;
    const next = existing ? mergeEvent(existing, event) : createSession(input, event);
    upsertMemory(next);
    return;
  }

  const ref = db.collection(VISITOR_SESSIONS_COLLECTION).doc(input.sessionId);
  const snap = await ref.get();

  if (!snap.exists) {
    const session = createSession(input, event);
    await ref.set(sanitize(session));
    upsertMemory(session);
    return;
  }

  const current = snap.data() as VisitorSession;
  if (shouldSkipHeartbeat({ ...current, id: input.sessionId })) return;

  const updated = mergeEvent({ ...current, id: input.sessionId }, event);
  await ref.set(sanitize(updated), { merge: true });
  upsertMemory(updated);
}

export async function listVisitorSessions(limit = 500): Promise<VisitorSession[]> {
  if (isAdminEnvConfigured()) {
    try {
      const db = await getSafeAdminDb();
      if (db) {
        try {
          const snap = await db
            .collection(VISITOR_SESSIONS_COLLECTION)
            .orderBy("startedAt", "desc")
            .limit(limit)
            .get();
          const sessions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as VisitorSession);
          if (sessions.length > 0) return sessions;
        } catch (orderError) {
          console.warn("visitor_sessions orderBy failed, using fallback:", orderError);
          const snap = await db.collection(VISITOR_SESSIONS_COLLECTION).limit(limit).get();
          const sessions = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as VisitorSession)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
          if (sessions.length > 0) return sessions;
        }
      }
    } catch (error) {
      console.warn("listVisitorSessions failed:", error);
    }
  }
  return [...memorySessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
}

function dateKeyInIST(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return iso.slice(0, 10);
  }
}

function dateLabel(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  try {
    return new Date(`${key}T12:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return key;
  }
}

function isSessionOnline(session: VisitorSession, now: number): boolean {
  return now - new Date(session.lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;
}

export function buildVisitorAnalyticsPayload(
  sessions: VisitorSession[],
  aiStatsMap = buildAiStatsByIdentity([])
): VisitorAnalyticsPayload {
  const now = Date.now();
  const todayKey = dateKeyInIST(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = dateKeyInIST(yesterdayDate.toISOString());

  const todaySessions = sessions.filter((s) => dateKeyInIST(s.startedAt) === todayKey);
  const yesterdaySessions = sessions.filter((s) => dateKeyInIST(s.startedAt) === yesterdayKey);

  const uniqueVisitorsToday = new Set(todaySessions.map((s) => s.visitorId)).size;
  const uniqueVisitorsYesterday = new Set(yesterdaySessions.map((s) => s.visitorId)).size;
  const onlineNow = sessions.filter((s) => isSessionOnline(s, now)).length;
  const pageViewsToday = todaySessions.reduce((sum, s) => sum + s.pageViewCount, 0);
  const avgDurationTodaySec =
    todaySessions.length > 0
      ? Math.round(
          todaySessions.reduce((sum, s) => sum + s.durationSec, 0) / todaySessions.length
        )
      : 0;

  const sourceCounts: Record<string, number> = {};
  for (const s of todaySessions) {
    sourceCounts[s.source] = (sourceCounts[s.source] ?? 0) + 1;
  }
  const topSourceToday =
    Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const exitCounts: Record<string, number> = {};
  for (const s of todaySessions) {
    exitCounts[s.exitPath] = (exitCounts[s.exitPath] ?? 0) + 1;
  }
  const topExitPageToday =
    Object.entries(exitCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const stats: VisitorAnalyticsStats = {
    visitorsToday: uniqueVisitorsToday,
    visitorsYesterday: uniqueVisitorsYesterday,
    onlineNow,
    pageViewsToday,
    avgDurationTodaySec,
    topSourceToday,
    topExitPageToday,
  };

  const dayMap = new Map<string, VisitorDayGroup>();
  for (const session of sessions) {
    const key = dateKeyInIST(session.startedAt);
    const existing = dayMap.get(key);
    if (existing) {
      existing.sessions.push(session);
    } else {
      dayMap.set(key, {
        dateKey: key,
        dateLabel: dateLabel(key, todayKey, yesterdayKey),
        isToday: key === todayKey,
        isYesterday: key === yesterdayKey,
        sessions: [session],
        visitorGroups: [],
      });
    }
  }

  const days = Array.from(dayMap.values())
    .map((day) => ({
      ...day,
      sessions: day.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      visitorGroups: groupSessionsByVisitor(day.sessions, aiStatsMap, now),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  return {
    stats,
    days,
    totalSessions: sessions.length,
  };
}

export async function getVisitorAnalytics(): Promise<VisitorAnalyticsPayload> {
  const [sessions, enquiries] = await Promise.all([
    listVisitorSessions(500),
    listAiAssistantEnquiries(500),
  ]);
  const aiStatsMap = buildAiStatsByIdentity(enquiries);
  return buildVisitorAnalyticsPayload(sessions, aiStatsMap);
}
