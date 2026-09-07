import { redirect } from "next/navigation";

/** Dashboard page removed — land staff on Bookings instead. */
export default function AdminDashboardPage() {
  redirect("/admin/bookings");
}
