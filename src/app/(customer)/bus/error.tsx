"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BusError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[bus]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Bus booking unavailable</h1>
      <p className="max-w-md text-sm text-slate-600">
        We could not load this step. Please go back to search results and try again.
      </p>
      <div className="flex gap-3">
        <Button className="bg-[#1a4fa3]" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.assign("/bus/results")}>
          Back to buses
        </Button>
      </div>
    </div>
  );
}
