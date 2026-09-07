import { redirect } from "next/navigation";

/** Analytics page removed from admin — keep URL redirect for old bookmarks. */
export default function AnalyticsPage() {
  redirect("/admin/bookings");
}
