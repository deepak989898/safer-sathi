"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlightSoftCard, flightPrimaryButtonClass } from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedCancellationCharges } from "@/lib/tripjack/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface FlightCancelDialogProps {
  open: boolean;
  charges: NormalizedCancellationCharges | null;
  loadingCharges: boolean;
  confirming: boolean;
  error: string | null;
  locale: Locale;
  onClose: () => void;
  onRetryCharges: () => void;
  onConfirm: () => void;
}

export function FlightCancelDialog({
  open,
  charges,
  loadingCharges,
  confirming,
  error,
  locale,
  onClose,
  onRetryCharges,
  onConfirm,
}: FlightCancelDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <FlightSoftCard className="w-full max-w-lg shadow-2xl">
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cancel booking</h2>
              <p className="text-sm text-slate-600">Review charges before confirming.</p>
            </div>
          </div>

          {loadingCharges && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading cancellation charges...
            </div>
          )}

          {error && !loadingCharges && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onRetryCharges}>
                Retry
              </Button>
            </div>
          )}

          {charges && !loadingCharges && (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Refundability</span>
                <span className={cn("font-semibold", charges.refundable ? "text-emerald-700" : "text-red-700")}>
                  {charges.refundable ? "Refundable" : "Non-refundable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cancellation charges</span>
                <span className="font-semibold">
                  {formatCurrency(charges.cancellationCharges, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Refund amount</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(charges.refundAmount, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Airline charges</span>
                <span>
                  {charges.airlineCharges > 0
                    ? formatCurrency(charges.airlineCharges, locale)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Supplier charges</span>
                <span>
                  {charges.supplierCharges > 0
                    ? formatCurrency(charges.supplierCharges, locale)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Convenience fee</span>
                <span>
                  {charges.convenienceFee > 0
                    ? formatCurrency(charges.convenienceFee, locale)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-[#1a4fa3]">
                <span>Total refund</span>
                <span>{formatCurrency(charges.totalRefund, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cancellation deadline</span>
                <span>{charges.cancellationDeadline || "As per airline rules"}</span>
              </div>
              {charges.trips.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Passenger / Segment charges
                  </p>
                  {charges.trips.map((trip, idx) => (
                    <div key={`${trip.src}-${trip.dest}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-2.5">
                      <p className="text-xs font-semibold text-slate-700">
                        {trip.src} → {trip.dest} {trip.departureDate ? `· ${trip.departureDate}` : ""}
                      </p>
                      {trip.paxCharges.map((pax, pIdx) => (
                        <p key={`${pax.type}-${pIdx}`} className="mt-1 text-xs text-slate-600">
                          {pax.type}: Charges {formatCurrency(pax.amendmentCharges, locale)} · Refund{" "}
                          {formatCurrency(pax.refundAmount, locale)}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            This action cannot be undone.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={confirming}
              onClick={onClose}
            >
              Back
            </Button>
            <Button
              className={cn(flightPrimaryButtonClass(), "sm:w-auto sm:px-6")}
              disabled={!charges || loadingCharges || confirming}
              onClick={onConfirm}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </div>
      </FlightSoftCard>
    </div>
  );
}
