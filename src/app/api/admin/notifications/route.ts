import { z } from "zod";
import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import {
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "@/lib/admin/notifications";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  id: z.string().optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const notifications = await listAdminNotifications(50);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    console.error("List admin notifications error:", error);
    return apiError("Failed to load notifications", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.markAllRead) {
      await markAllAdminNotificationsRead();
      return apiSuccess({ updated: "all" });
    }

    if (!parsed.data.id) {
      return apiError("Notification id is required", 400);
    }

    await markAdminNotificationRead(parsed.data.id);
    return apiSuccess({ id: parsed.data.id, read: true });
  } catch (error) {
    console.error("Patch admin notification error:", error);
    return apiError("Failed to update notification", 500);
  }
}
