"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/i18n";
import type { HotelCancellationEstimate } from "@/lib/hotels/cancellation-estimate";
import type { Locale } from "@/types";

interface HotelCancelDialogProps {
  open: boolean;
  estimate: HotelCancellationEstimate | null;
  loadingEstimate: boolean;
  confirming: boolean;
  error: string | null;
  locale: Locale;
  onClose: () => void;
  onRetryEstimate: () => void;
  onConfirm: () => void;
}

export function HotelCancelDialog({
  open,
  estimate,
  loadingEstimate,
  confirming,
  error,
  locale,
  onClose,
  onRetryEstimate,
  onConfirm,
}: HotelCancelDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl">
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cancel hotel booking</h2>
              <p className="text-sm text-slate-600">Review charges before confirming.</p>
            </div>
          </div>

          {loadingEstimate && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cancellation estimate…
            </div>
          )}

          {error && !loadingEstimate && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onRetryEstimate}>
                Retry
              </Button>
            </div>
          )}

          {estimate && !loadingEstimate && (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-600">{estimate.penaltyLabel}</p>
              <div className="flex justify-between">
                <span className="text-slate-600">Cancellation charge</span>
                <span className="font-semibold">
                  {formatCurrency(estimate.cancellationCharge, locale)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-emerald-700">
                <span>Estimated refund</span>
                <span>{formatCurrency(estimate.expectedRefund, locale)}</span>
              </div>
            </div>
          )}

          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            This action cannot be undone.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" disabled={confirming} onClick={onClose}>
              Keep booking
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700"
              disabled={confirming || loadingEstimate || !estimate}
              onClick={onConfirm}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Confirm cancellation"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
