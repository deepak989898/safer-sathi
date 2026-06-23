import MyBookingsClient from "./my-bookings-client";
import { RequireAuth } from "@/components/auth/require-auth";

export default function MyBookingsPage() {
  return (
    <RequireAuth>
      <MyBookingsClient />
    </RequireAuth>
  );
}
