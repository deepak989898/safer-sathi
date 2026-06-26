export type VisitorEventType =
  | "page_view"
  | "click"
  | "search"
  | "exit"
  | "heartbeat";

export interface VisitorEvent {
  id: string;
  type: VisitorEventType;
  at: string;
  path: string;
  title?: string;
  label?: string;
  target?: string;
  searchQuery?: string;
}

export interface VisitorSession {
  id: string;
  visitorId: string;
  startedAt: string;
  endedAt: string;
  lastSeenAt: string;
  durationSec: number;
  entryPath: string;
  exitPath: string;
  referrer: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  device: string;
  browser: string;
  deviceId?: string;
  deviceName?: string;
  language: string;
  ip?: string;
  country?: string;
  city?: string;
  pageViewCount: number;
  clickCount: number;
  searchCount: number;
  events: VisitorEvent[];
}

/** Same person/device — multiple visit sessions grouped for admin. */
export interface VisitorUserGroup {
  visitorId: string;
  deviceId?: string;
  deviceName?: string;
  device: string;
  browser: string;
  displayLabel: string;
  sessionCount: number;
  totalPageViews: number;
  totalClicks: number;
  totalSearches: number;
  totalDurationSec: number;
  aiChatSessions: number;
  aiMessages: number;
  lastSeenAt: string;
  isOnline: boolean;
  country?: string;
  city?: string;
  ip?: string;
  sessions: VisitorSession[];
}

export interface VisitorDayGroup {
  dateKey: string;
  dateLabel: string;
  isToday: boolean;
  isYesterday: boolean;
  sessions: VisitorSession[];
  visitorGroups: VisitorUserGroup[];
}

export interface VisitorAnalyticsStats {
  visitorsToday: number;
  visitorsYesterday: number;
  onlineNow: number;
  pageViewsToday: number;
  avgDurationTodaySec: number;
  topSourceToday: string;
  topExitPageToday: string;
}

export interface VisitorAnalyticsPayload {
  stats: VisitorAnalyticsStats;
  days: VisitorDayGroup[];
  totalSessions: number;
}
