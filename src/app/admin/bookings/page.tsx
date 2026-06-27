import { Suspense } from "react";
import BookingsAdminClient from "./bookings-admin-client";

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading bookings...</div>}>
      <BookingsAdminClient />
    </Suspense>
  );
}
