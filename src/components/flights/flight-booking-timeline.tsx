"use client";

import { Check } from "lucide-react";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "confirmed", label: "Booking Confirmed" },
  { id: "cancellation_requested", label: "Cancellation Requested" },
  { id: "refund_processing", label: "Refund Processing" },
  { id: "refund_completed", label: "Refund Completed" },
] as const;

function activeStepIndex(booking: FlightBookingRecord): number {
  if (booking.status === "refund_completed") return 3;
  if (booking.status === "cancelled" && booking.refundStatus === "completed") return 3;
  if (
    booking.status === "cancellation_requested" ||
    booking.refundStatus === "processing" ||
    booking.refundStatus === "pending"
  ) {
    if (booking.pollStatus === "polling" || booking.refundStatus === "processing") return 2;
    return 1;
  }
  if (booking.status === "cancelled") return 1;
  if (
    booking.status === "confirmed" ||
    booking.status === "booking_pending" ||
    booking.paymentStatus === "paid"
  ) {
    return 0;
  }
  return -1;
}

export function FlightBookingTimeline({ booking }: { booking: FlightBookingRecord }) {
  const active = activeStepIndex(booking);
  if (active < 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <p className="mb-4 text-sm font-semibold text-slate-900">Booking timeline</p>
      <div className="space-y-0">
        {STEPS.map((step, index) => {
          const done = index < active || (index === active && active === 3);
          const current = index === active && active < 3;
          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    done && "bg-emerald-500 text-white",
                    current && "bg-[#1a4fa3] text-white",
                    !done && !current && "bg-slate-100 text-slate-400"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "my-1 w-px flex-1 min-h-[20px]",
                      index < active ? "bg-emerald-400" : "bg-slate-200"
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  "pb-4 text-sm font-medium",
                  current ? "text-[#1a4fa3]" : done ? "text-emerald-700" : "text-slate-400"
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
