import { listAiAssistantEnquiries } from "@/lib/ai/travel-manager/enquiry-service";
import { getBookings } from "@/lib/data-service";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { getCustomerRewards } from "@/lib/rewards/rewards-service";
import { listVisitorSessions } from "@/lib/visitor-analytics/repository";
import {
  groupEnquiriesIntoVisitorSessions,
  type AiAssistantEnquiry,
  type AiEnquiryVisitorSession,
} from "@/types/ai-enquiry";
import type { Booking, RewardTransaction, User, UserRole } from "@/types";
import type { VisitorEvent, VisitorSession } from "@/types/visitor-analytics";

export interface CustomerBookingStats {
  totalBookings: number;
  totalSpent: number;
  firstBookingAt: string | null;
}

export interface CustomerListItem extends User {
  joinDate: string;
  firstBookingAt: string | null;
  visitCount: number;
  computedTotalBookings: number;
  computedTotalSpent: number;
}

export interface CustomerActivityEvent {
  id: string;
  at: string;
  type:
    | "visit_start"
    | "visit_end"
    | "page_view"
    | "search"
    | "click"
    | "booking"
    | "reward"
    | "ai_chat";
  title: string;
  detail?: string;
  path?: string;
}

export interface CustomerProfileDetail {
  user: User;
  stats: CustomerBookingStats & { visitCount: number };
  bookings: Booking[];
  rewards: {
    rewardPoints: number;
    lifetimeRewardPoints: number;
    transactions: RewardTransaction[];
  };
  aiChatSessions: AiEnquiryVisitorSession[];
  visitorSessions: VisitorSession[];
  activity: CustomerActivityEvent[];
}

function mapUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    phone: data.phone ? String(data.phone) : undefined,
    role: (data.role as UserRole) ?? "customer",
    status: (data.status as User["status"]) ?? "active",
    approved: Boolean(data.approved ?? true),
    avatar: data.avatar ? String(data.avatar) : undefined,
    locale: (data.locale as User["locale"]) ?? "en",
    segment: data.segment as User["segment"],
    totalBookings: Number(data.totalBookings ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    lastBookingNumber: data.lastBookingNumber
      ? String(data.lastBookingNumber)
      : undefined,
    passwordIsBookingId: data.passwordIsBookingId === true,
    rewardPoints: Number(data.rewardPoints ?? 0),
    lifetimeRewardPoints: Number(data.lifetimeRewardPoints ?? 0),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function listUsersFromFirestore(): Promise<User[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection("users").limit(500).get();
    return snap.docs.map((d) => mapUser(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.warn("listUsersFromFirestore failed:", error);
    return [];
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function bookingSpend(booking: Booking): number {
  if (booking.paymentStatus === "paid" || booking.paymentStatus === "partial") {
    return Number(booking.paidAmount ?? booking.amount ?? 0);
  }
  if (booking.status === "confirmed" || booking.status === "completed") {
    return Number(booking.paidAmount ?? booking.amount ?? 0);
  }
  return 0;
}

function buildBookingStatsMaps(bookings: Booking[]) {
  const byUserId = new Map<string, CustomerBookingStats>();
  const byEmail = new Map<string, CustomerBookingStats>();

  const touch = (key: string, map: Map<string, CustomerBookingStats>, booking: Booking) => {
    const existing = map.get(key) ?? {
      totalBookings: 0,
      totalSpent: 0,
      firstBookingAt: null,
    };
    existing.totalBookings += 1;
    existing.totalSpent += bookingSpend(booking);
    if (!existing.firstBookingAt || booking.createdAt < existing.firstBookingAt) {
      existing.firstBookingAt = booking.createdAt;
    }
    map.set(key, existing);
  };

  for (const booking of bookings) {
    if (booking.userId) touch(booking.userId, byUserId, booking);
    if (booking.customerEmail) {
      touch(normalizeEmail(booking.customerEmail), byEmail, booking);
    }
  }

  return { byUserId, byEmail };
}

function enquiriesForUser(
  enquiries: AiAssistantEnquiry[],
  user: User
): AiAssistantEnquiry[] {
  const email = normalizeEmail(user.email);
  return enquiries.filter(
    (e) =>
      e.userId === user.id ||
      (e.customerEmail && normalizeEmail(e.customerEmail) === email)
  );
}

function visitorIdsForUser(
  enquiries: AiAssistantEnquiry[],
  user: User,
  sessions: VisitorSession[]
): Set<string> {
  const ids = new Set<string>();
  for (const e of enquiriesForUser(enquiries, user)) {
    if (e.visitorId) ids.add(e.visitorId);
    if (e.guestId) ids.add(e.guestId);
  }
  for (const s of sessions) {
    if (s.userId === user.id) ids.add(s.visitorId);
  }
  return ids;
}

function countVisitsForUser(
  visitorIds: Set<string>,
  sessions: VisitorSession[],
  userId: string
): number {
  return sessions.filter(
    (s) => visitorIds.has(s.visitorId) || s.userId === userId
  ).length;
}

function resolveBookingStats(
  user: User,
  byUserId: Map<string, CustomerBookingStats>,
  byEmail: Map<string, CustomerBookingStats>
): CustomerBookingStats {
  return (
    byUserId.get(user.id) ??
    byEmail.get(normalizeEmail(user.email)) ?? {
      totalBookings: 0,
      totalSpent: 0,
      firstBookingAt: null,
    }
  );
}

export async function buildCustomerListItems(
  users: User[],
  bookings?: Booking[],
  enquiries?: AiAssistantEnquiry[],
  sessions?: VisitorSession[]
): Promise<CustomerListItem[]> {
  const allBookings = bookings ?? (await getBookings());
  const allEnquiries = enquiries ?? (await listAiAssistantEnquiries(500));
  const allSessions = sessions ?? (await listVisitorSessions(500));
  const { byUserId, byEmail } = buildBookingStatsMaps(allBookings);

  return users.map((user) => {
    const stats = resolveBookingStats(user, byUserId, byEmail);
    const visitorIds = visitorIdsForUser(allEnquiries, user, allSessions);
    const visitCount = countVisitsForUser(visitorIds, allSessions, user.id);

    return {
      ...user,
      joinDate: user.createdAt,
      firstBookingAt: stats.firstBookingAt,
      visitCount,
      computedTotalBookings: stats.totalBookings,
      computedTotalSpent: stats.totalSpent,
      totalBookings: stats.totalBookings || user.totalBookings,
      totalSpent: stats.totalSpent || user.totalSpent,
    };
  });
}

function buildActivityTimeline(input: {
  bookings: Booking[];
  sessions: VisitorSession[];
  rewardTransactions: RewardTransaction[];
  aiSessions: AiEnquiryVisitorSession[];
}): CustomerActivityEvent[] {
  const events: CustomerActivityEvent[] = [];

  for (const session of input.sessions) {
    events.push({
      id: `visit_${session.id}`,
      at: session.startedAt,
      type: "visit_start",
      title: "Website visit started",
      detail: `${session.entryPath} · ${session.device}`,
      path: session.entryPath,
    });
    if (session.endedAt !== session.startedAt) {
      events.push({
        id: `visit_end_${session.id}`,
        at: session.endedAt,
        type: "visit_end",
        title: "Website visit ended",
        detail: `Duration ${Math.round(session.durationSec / 60)} min · exit ${session.exitPath}`,
        path: session.exitPath,
      });
    }
    for (const ev of session.events.slice(-20)) {
      if (ev.type === "page_view") {
        events.push({
          id: ev.id,
          at: ev.at,
          type: "page_view",
          title: ev.title || "Page view",
          detail: ev.path,
          path: ev.path,
        });
      } else if (ev.type === "search" && ev.searchQuery) {
        events.push({
          id: ev.id,
          at: ev.at,
          type: "search",
          title: `Search: ${ev.searchQuery}`,
          path: ev.path,
        });
      } else if (ev.type === "click" && ev.label) {
        events.push({
          id: ev.id,
          at: ev.at,
          type: "click",
          title: ev.label,
          path: ev.path,
        });
      }
    }
  }

  for (const booking of input.bookings) {
    events.push({
      id: `booking_${booking.id}`,
      at: booking.createdAt,
      type: "booking",
      title: `Booking ${booking.bookingNumber}`,
      detail: `${booking.serviceName?.en ?? booking.serviceType} · ₹${booking.amount.toLocaleString("en-IN")} · ${booking.status}`,
    });
  }

  for (const tx of input.rewardTransactions) {
    events.push({
      id: `reward_${tx.id}`,
      at: tx.createdAt,
      type: "reward",
      title: tx.type === "earn" ? "Reward points earned" : "Reward points used",
      detail: `${tx.points > 0 ? "+" : ""}${tx.points} pts · ${tx.note ?? tx.bookingNumber ?? ""}`,
    });
  }

  for (const chat of input.aiSessions) {
    events.push({
      id: `ai_${chat.id}`,
      at: chat.startedAt,
      type: "ai_chat",
      title: "AI assistant chat",
      detail: `${chat.messageCount} messages · ${chat.locationReadable}`,
    });
  }

  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 120);
}

export async function getCustomerProfileDetail(userId: string): Promise<CustomerProfileDetail | null> {
  if (!isAdminEnvConfigured()) return null;

  const db = await getSafeAdminDb();
  if (!db) return null;

  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return null;

  const user = mapUser(userSnap.id, userSnap.data() as Record<string, unknown>);
  const email = normalizeEmail(user.email);

  const [allBookings, rewards, allEnquiries, allSessions] = await Promise.all([
    getBookings(),
    getCustomerRewards(userId),
    listAiAssistantEnquiries(500),
    listVisitorSessions(500),
  ]);

  const bookings = allBookings.filter(
    (b) => b.userId === userId || normalizeEmail(b.customerEmail) === email
  );

  const userEnquiries = enquiriesForUser(allEnquiries, user);
  const aiChatSessions = groupEnquiriesIntoVisitorSessions(userEnquiries);

  const visitorIds = visitorIdsForUser(allEnquiries, user, allSessions);
  const visitorSessions = allSessions
    .filter((s) => visitorIds.has(s.visitorId) || s.userId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 50);

  const bookingMaps = buildBookingStatsMaps(bookings);
  const bookingStats =
    bookingMaps.byUserId.get(userId) ??
    bookingMaps.byEmail.get(email) ?? {
      totalBookings: 0,
      totalSpent: 0,
      firstBookingAt: null,
    };

  const visitCount = countVisitsForUser(visitorIds, allSessions, userId);

  const activity = buildActivityTimeline({
    bookings,
    sessions: visitorSessions,
    rewardTransactions: rewards.transactions,
    aiSessions: aiChatSessions,
  });

  return {
    user,
    stats: {
      ...bookingStats,
      visitCount,
    },
    bookings: bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    rewards,
    aiChatSessions,
    visitorSessions,
    activity,
  };
}
