import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { BookingCheckoutClient } from "./booking-checkout-client";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <BookingCheckoutClient />
    </Suspense>
  );
}
