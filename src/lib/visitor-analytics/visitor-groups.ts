import { groupEnquiriesIntoVisitorSessions } from "@/types/ai-enquiry";
import type { AiAssistantEnquiry } from "@/types/ai-enquiry";
import type { VisitorSession, VisitorUserGroup } from "@/types/visitor-analytics";
import { ONLINE_THRESHOLD_MS } from "@/lib/visitor-analytics/constants";

export interface VisitorAiStats {
  aiChatSessions: number;
  aiMessages: number;
}

function normalizeIdentityKey(id?: string): string | undefined {
  if (!id?.trim()) return undefined;
  const trimmed = id.trim();
  if (trimmed.startsWith("guest_")) return `v_${trimmed.slice(6)}`;
  return trimmed;
}

function collectIdentityKeys(values: Array<string | undefined>): string[] {
  const keys = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    keys.add(value);
    const normalized = normalizeIdentityKey(value);
    if (normalized) keys.add(normalized);
  }
  return [...keys];
}

export function buildAiStatsByIdentity(
  enquiries: AiAssistantEnquiry[]
): Map<string, VisitorAiStats> {
  const map = new Map<string, VisitorAiStats>();
  const chatSessions = groupEnquiriesIntoVisitorSessions(enquiries);

  for (const chat of chatSessions) {
    const keys = collectIdentityKeys([chat.visitorKey]);
    const stats: VisitorAiStats = { aiChatSessions: 1, aiMessages: chat.messageCount };

    for (const key of keys) {
      const existing = map.get(key) ?? { aiChatSessions: 0, aiMessages: 0 };
      existing.aiChatSessions += stats.aiChatSessions;
      existing.aiMessages += stats.aiMessages;
      map.set(key, existing);
    }
  }

  return map;
}

function lookupAiStats(
  map: Map<string, VisitorAiStats>,
  session: VisitorSession
): VisitorAiStats {
  const keys = collectIdentityKeys([
    session.visitorId,
    session.deviceId,
    session.ip ? `ip:${session.ip}` : undefined,
  ]);

  let chatSessions = 0;
  let messages = 0;
  for (const key of keys) {
    const stats = map.get(key);
    if (!stats) continue;
    chatSessions = Math.max(chatSessions, stats.aiChatSessions);
    messages = Math.max(messages, stats.aiMessages);
  }
  return { aiChatSessions: chatSessions, aiMessages: messages };
}

function groupKey(session: VisitorSession): string {
  return `${session.visitorId}::${session.deviceId ?? session.device}`;
}

function buildDisplayLabel(
  visitorId: string,
  deviceName: string | undefined,
  device: string,
  browser: string
): string {
  const visitorTail = visitorId.replace(/^(v_|guest_)/, "").slice(-8) || visitorId.slice(-6);
  const devicePart = deviceName?.trim() || `${browser} on ${device}`;
  return `${devicePart} · Visitor …${visitorTail}`;
}

export function groupSessionsByVisitor(
  sessions: VisitorSession[],
  aiStatsMap: Map<string, VisitorAiStats>,
  now: number
): VisitorUserGroup[] {
  const groups = new Map<string, VisitorUserGroup>();

  for (const session of sessions) {
    const key = groupKey(session);
    const ai = lookupAiStats(aiStatsMap, session);
    const online = now - new Date(session.lastSeenAt).getTime() <= ONLINE_THRESHOLD_MS;

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        visitorId: session.visitorId,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        device: session.device,
        browser: session.browser,
        displayLabel: buildDisplayLabel(
          session.visitorId,
          session.deviceName,
          session.device,
          session.browser
        ),
        sessionCount: 1,
        totalPageViews: session.pageViewCount,
        totalClicks: session.clickCount,
        totalSearches: session.searchCount,
        totalDurationSec: session.durationSec,
        aiChatSessions: ai.aiChatSessions,
        aiMessages: ai.aiMessages,
        lastSeenAt: session.lastSeenAt,
        isOnline: online,
        country: session.country,
        city: session.city,
        ip: session.ip,
        sessions: [session],
      });
      continue;
    }

    existing.sessionCount += 1;
    existing.totalPageViews += session.pageViewCount;
    existing.totalClicks += session.clickCount;
    existing.totalSearches += session.searchCount;
    existing.totalDurationSec += session.durationSec;
    existing.aiChatSessions = Math.max(existing.aiChatSessions, ai.aiChatSessions);
    existing.aiMessages = Math.max(existing.aiMessages, ai.aiMessages);
    if (session.lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = session.lastSeenAt;
      existing.isOnline = online;
      existing.country = session.country ?? existing.country;
      existing.city = session.city ?? existing.city;
      existing.ip = session.ip ?? existing.ip;
    }
    if (!existing.deviceName && session.deviceName) {
      existing.deviceName = session.deviceName;
      existing.displayLabel = buildDisplayLabel(
        existing.visitorId,
        existing.deviceName,
        existing.device,
        existing.browser
      );
    }
    existing.sessions.push(session);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sessions: group.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    }))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}
