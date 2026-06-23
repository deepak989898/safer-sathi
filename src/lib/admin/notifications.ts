import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

export type AdminNotificationType =
  | "booking_confirmed"
  | "booking_pending"
  | "payment_failed"
  | "approval_pending";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  href: string;
  read: boolean;
  bookingId?: string;
  createdAt: string;
}

const COLLECTION = "admin_notifications";

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function createAdminNotification(
  input: Omit<AdminNotification, "id" | "read" | "createdAt"> & { id?: string }
): Promise<AdminNotification | null> {
  if (!isAdminEnvConfigured()) return null;

  const db = await getSafeAdminDb();
  if (!db) return null;

  const notification: AdminNotification = {
    id: input.id ?? `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href,
    bookingId: input.bookingId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(notification.id).set(sanitize(notification));
  return notification;
}

export async function listAdminNotifications(limit = 40): Promise<AdminNotification[]> {
  if (!isAdminEnvConfigured()) return [];

  const db = await getSafeAdminDb();
  if (!db) return [];

  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as AdminNotification);
  } catch {
    const snap = await db.collection(COLLECTION).limit(limit).get();
    return snap.docs
      .map((doc) => doc.data() as AdminNotification)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function markAdminNotificationRead(id: string): Promise<boolean> {
  if (!isAdminEnvConfigured()) return false;

  const db = await getSafeAdminDb();
  if (!db) return false;

  await db.collection(COLLECTION).doc(id).set(
    { read: true, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return true;
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const items = await listAdminNotifications(100);
  const unread = items.filter((n) => !n.read);
  await Promise.all(unread.map((n) => markAdminNotificationRead(n.id)));
}
