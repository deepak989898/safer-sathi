import { getBookings } from "@/lib/data-service";
import MyBookingsClient from "./my-bookings-client";

export default async function MyBookingsPage() {
  const bookings = await getBookings();
  return <MyBookingsClient bookings={bookings} />;
}
