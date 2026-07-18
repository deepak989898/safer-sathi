"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getHotelSearchSessionRemainingMs } from "@/lib/tripjack-hotels/session";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function HotelSessionCountdown({ onExpired }: { onExpired?: () => void }) {
  const [remainingMs, setRemainingMs] = useState(() => getHotelSearchSessionRemainingMs());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = getHotelSearchSessionRemainingMs();
      setRemainingMs(next);
      if (next <= 0) onExpired?.();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onExpired]);

  if (remainingMs <= 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Session expired. Please search hotels again to get fresh rates.
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
      <Clock className="h-3.5 w-3.5 text-red-600" />
      Rates valid for {formatRemaining(remainingMs)} (approx. 15 min session)
    </div>
  );
}
