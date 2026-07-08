"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { HotelOptionPricingAuditRow } from "@/lib/tripjack-hotels/pricing-display";
import { buildOptionPricingAuditRow } from "@/lib/tripjack-hotels/pricing-display";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

interface HotelPricingDebugPanelProps {
  requestBody: unknown;
  rawResponse: unknown;
  adminMessage?: string | null;
  options?: NormalizedHotelOption[];
  selectedOptionId?: string;
  markupPercent?: number;
}

function AuditTable({
  rows,
  selectedOptionId,
}: {
  rows: HotelOptionPricingAuditRow[];
  selectedOptionId?: string;
}) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-violet-200 bg-white">
      <table className="min-w-full text-left text-[11px]">
        <thead className="bg-violet-50 text-violet-900">
          <tr>
            {[
              "optionId",
              "room",
              "mealBasis",
              "refundable",
              "totalPrice",
              "apiTotal",
              "base",
              "taxes",
              "mf",
              "mft",
              "strike",
              "commercial",
              "commission",
              "markup",
            ].map((head) => (
              <th key={head} className="px-2 py-2 font-semibold uppercase tracking-wide">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.optionId === selectedOptionId;
            return (
              <tr
                key={row.optionId}
                className={selected ? "bg-amber-50 font-semibold" : "odd:bg-slate-50/60"}
              >
                <td className="px-2 py-2 font-mono">{row.optionId}</td>
                <td className="px-2 py-2">{row.roomNames.join(" · ")}</td>
                <td className="px-2 py-2">
                  {row.mealBasisLabel} ({row.mealBasis})
                </td>
                <td className="px-2 py-2">{row.isRefundable ? "yes" : "no"}</td>
                <td className="px-2 py-2">{row.totalPrice}</td>
                <td className="px-2 py-2">{row.apiTotalPrice}</td>
                <td className="px-2 py-2">{row.basePrice}</td>
                <td className="px-2 py-2">{row.taxes}</td>
                <td className="px-2 py-2">{row.mf}</td>
                <td className="px-2 py-2">{row.mft}</td>
                <td className="px-2 py-2">{row.strikethroughPrice ?? "—"}</td>
                <td className="px-2 py-2">{row.commercialType || "—"}</td>
                <td className="px-2 py-2">{row.commission}</td>
                <td className="px-2 py-2">{row.customerMarkup}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HotelPricingDebugPanel({
  requestBody,
  rawResponse,
  adminMessage,
  options = [],
  selectedOptionId,
  markupPercent = 0,
}: HotelPricingDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const auditRows = options.map(buildOptionPricingAuditRow);
  const selectedRow = auditRows.find((row) => row.optionId === selectedOptionId);

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
      <p className="mt-2 text-xs text-violet-800">
        Customer markup config: {markupPercent}% (0 = TripJack API total only)
      </p>
      {selectedRow && (
        <p className="mt-1 text-xs text-violet-900">
          Selected option {selectedRow.optionId} · API total {selectedRow.apiTotalPrice}{" "}
          {selectedRow.currency}
          {selectedRow.customerMarkup > 0
            ? ` + markup ${selectedRow.customerMarkup} = ${selectedRow.totalPrice}`
            : ""}
        </p>
      )}
      {open && (
        <div className="mt-3 space-y-3">
          {auditRows.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800">
                Room options pricing audit
              </p>
              <AuditTable rows={auditRows} selectedOptionId={selectedOptionId} />
            </div>
          )}
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
