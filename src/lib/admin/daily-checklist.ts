import { listAiAssistantEnquiries } from "@/lib/ai/travel-manager/enquiry-service";
import { getBookings } from "@/lib/data-service";
import { getAdminPackages, hydratePackagesStore } from "@/lib/package-store";
import { canApprovePackages, canManageUser } from "@/lib/auth/permissions";
import type { UserRole } from "@/types";
import type { Booking } from "@/types";
import {
  groupEnquiriesIntoVisitorSessions,
  type AiEnquiryVisitorSession,
} from "@/types/ai-enquiry";
import { formatCurrency, localizedText } from "@/lib/i18n";

const HIGH_INTENT_STEPS = new Set([
  "package_tiers",
  "package_review",
  "customize",
  "booking_form",
  "payment",
  "hotel_results",
  "vehicle_results",
]);

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export interface DailyChecklistItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: "booking" | "ai_enquiry" | "approval";
  priority: "high" | "medium";
}

export interface AdminDailyChecklist {
  pendingBookings: number;
  unconvertedAiChats: number;
  pendingApprovals: number;
  items: DailyChecklistItem[];
}

function bookingNeedsAction(booking: Booking): boolean {
  return (
    booking.status === "pending" ||
    booking.paymentStatus === "pending" ||
    booking.paymentStatus === "failed" ||
    booking.paymentStatus === "partial"
  );
}

function isFollowUpSession(session: AiEnquiryVisitorSession): boolean {
  if (session.status === "converted") return false;
  if (Date.now() - new Date(session.endedAt).getTime() > RECENT_MS) return false;

  return Boolean(
    session.customerPhone ||
      session.customerName ||
      (session.packagePrice != null && session.packagePrice > 0) ||
      (session.lastStep && HIGH_INTENT_STEPS.has(session.lastStep))
  );
}

function bookingItem(booking: Booking): DailyChecklistItem {
  const paymentLabel =
    booking.paymentStatus === "partial"
      ? "Partial payment — collect balance"
      : booking.paymentStatus === "failed"
        ? "Payment failed — contact customer"
        : "Awaiting payment or confirmation";

  return {
    id: `booking-${booking.id}`,
    title: `${booking.customerName} · ${booking.bookingNumber}`,
    subtitle: `${localizedText(booking.serviceName, "en")} · ${formatCurrency(booking.amount)} · ${paymentLabel}`,
    href: "/admin/bookings",
    category: "booking",
    priority:
      booking.paymentStatus === "failed" || booking.paymentStatus === "partial"
        ? "high"
        : "medium",
  };
}

function sessionItem(session: AiEnquiryVisitorSession): DailyChecklistItem {
  const contact =
    session.customerPhone ||
    session.customerName ||
    session.destination ||
    session.locationReadable;

  return {
    id: `ai-${session.id}`,
    title: contact || "Visitor chat",
    subtitle: [
      session.destination && `→ ${session.destination}`,
      session.packagePrice ? formatCurrency(session.packagePrice) : null,
      session.lastStep?.replace(/_/g, " "),
      "Did not complete booking",
    ]
      .filter(Boolean)
      .join(" · "),
    href: "/admin/ai-enquiries",
    category: "ai_enquiry",
    priority: session.customerPhone || session.packagePrice ? "high" : "medium",
  };
}

export async function buildAdminDailyChecklist(
  actorRole: UserRole,
  users: { id: string; name: string; role: UserRole; status: string; approved: boolean }[] = []
): Promise<AdminDailyChecklist> {
  await hydratePackagesStore();

  const [bookings, enquiries] = await Promise.all([
    getBookings(),
    listAiAssistantEnquiries(300).catch(() => []),
  ]);

  const items: DailyChecklistItem[] = [];

  let pendingBookings = 0;
  if (["super_admin", "manager", "sales_agent", "driver"].includes(actorRole)) {
    const actionable = bookings.filter(bookingNeedsAction);
    pendingBookings = actionable.length;
    items.push(
      ...actionable
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map(bookingItem)
    );
  }

  let unconvertedAiChats = 0;
  if (["super_admin", "manager", "sales_agent", "support_agent"].includes(actorRole)) {
    const sessions = groupEnquiriesIntoVisitorSessions(enquiries).filter(isFollowUpSession);
    unconvertedAiChats = sessions.length;
    items.push(...sessions.slice(0, 5).map(sessionItem));
  }

  let pendingApprovals = 0;
  if (canApprovePackages(actorRole)) {
    const pendingPackages = getAdminPackages("pending_approval");
    pendingApprovals += pendingPackages.length;
    items.push(
      ...pendingPackages.slice(0, 3).map((pkg) => ({
        id: `pkg-${pkg.id}`,
        title: localizedText(pkg.title, "en"),
        subtitle: "Tour package waiting for approval",
        href: "/admin/packages",
        category: "approval" as const,
        priority: "high" as const,
      }))
    );
  }

  if (actorRole === "super_admin" || actorRole === "manager") {
    const pendingUsers = users.filter(
      (u) =>
        u.status === "pending" &&
        !u.approved &&
        u.role !== "customer" &&
        canManageUser(actorRole, u.role)
    );
    pendingApprovals += pendingUsers.length;
    items.push(
      ...pendingUsers.slice(0, 3).map((u) => ({
        id: `user-${u.id}`,
        title: u.name,
        subtitle: `${u.role.replace("_", " ")} account awaiting approval`,
        href: "/admin/customers",
        category: "approval" as const,
        priority: "medium" as const,
      }))
    );
  }

  const sortedItems = items
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
      return 0;
    })
    .slice(0, 10);

  return {
    pendingBookings,
    unconvertedAiChats,
    pendingApprovals,
    items: sortedItems,
  };
}
