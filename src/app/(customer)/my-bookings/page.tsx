import MyBookingsClient from "./my-bookings-client";
import { RequireAuth } from "@/components/auth/require-auth";
import { getBookings } from "@/lib/data-service";

export default async function MyBookingsPage() {
  const bookings = await getBookings();
  return (
    <RequireAuth>
      <MyBookingsClient bookings={bookings} />
    </RequireAuth>
  );
}
