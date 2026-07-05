"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface HotelPricingDebugPanelProps {
  requestBody: unknown;
  rawResponse: unknown;
  adminMessage?: string | null;
}

export function HotelPricingDebugPanel({
  requestBody,
  rawResponse,
  adminMessage,
}: HotelPricingDebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-violet-900"
        onClick={() => setOpen((prev) => !prev)}
      >
        Super Admin — TripJack Pricing Debug
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {adminMessage && (
        <p className="mt-2 text-xs font-medium text-red-700">{adminMessage}</p>
      )}
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800">
              Request
            </p>
            <pre className="max-h-56 overflow-auto rounded-lg bg-white p-3 text-[11px] text-slate-800">
              {JSON.stringify(requestBody, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800">
              Response
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg bg-white p-3 text-[11px] text-slate-800">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
