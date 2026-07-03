"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import type { NormalizedFlightReview } from "@/lib/tripjack/types";
import type { Locale } from "@/types";

interface FlightReviewScreenProps {
  review: NormalizedFlightReview | null;
  context: FlightSearchContext | null;
  loading: boolean;
  error: string | null;
  locale: Locale;
  onRetry: () => void;
  onContinue: () => void;
}

export function FlightReviewScreen({
  review,
  context,
  loading,
  error,
  locale,
  onRetry,
  onContinue,
}: FlightReviewScreenProps) {
  const router = useRouter();

  if (!context && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="container mx-auto max-w-lg px-4 text-center">
          <Plane className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-900">Flight selection missing</h1>
          <p className="mt-2 text-sm text-slate-600">Please search again and select a flight.</p>
          <Button className="mt-6 bg-[#1a4fa3]" onClick={() => router.push("/flights")}>
            Back to search
          </Button>
        </div>
      </div>
    );
  }

  const routeLabel = context
    ? `${context.params.fromCode} → ${context.params.toCode}`
    : "Flight review";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-[#1a4fa3] text-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/flights"
            className="mb-2 inline-flex items-center text-sm text-blue-100 hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to results
          </Link>
          <h1 className="text-2xl font-bold">Review your flight</h1>
          <p className="text-sm text-blue-100">
            {routeLabel}
            {context?.params.departureDate ? ` · ${context.params.departureDate}` : ""}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a4fa3]" />
              <p className="text-slate-700">Fetching latest fare from airline...</p>
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="rounded-2xl border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Review failed</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {review && !loading && !error && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {review.fareUpdated && (
                <Card className="rounded-2xl border-amber-200 bg-amber-50">
                  <CardContent className="pt-5 text-sm text-amber-900">
                    {review.fareAlertMessage ??
                      "Fare updated by airline. Please review the latest fare."}
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="space-y-5 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-[#1a4fa3]">
                        {review.airlineCode || "—"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{review.airlineName}</p>
                        <p className="text-sm text-slate-500">
                          {review.airlineCode} {review.flightNumber}
                          {review.isLcc ? " · LCC" : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{review.fareIdentifier}</Badge>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{review.departureTime}</p>
                      <p className="font-medium text-slate-800">{review.departureAirportCode}</p>
                      <p className="text-xs text-slate-500">{review.departureCity}</p>
                      {review.departureTerminal && (
                        <p className="text-xs text-slate-400">{review.departureTerminal}</p>
                      )}
                    </div>
                    <div className="text-center text-xs text-slate-500">
                      <p>{review.durationFormatted}</p>
                      <p className="mt-1 font-medium">
                        {review.stops === 0
                          ? "Non-stop"
                          : review.stops === 1
                            ? "1 Stop"
                            : `${review.stops} Stops`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{review.arrivalTime}</p>
                      <p className="font-medium text-slate-800">{review.arrivalAirportCode}</p>
                      <p className="text-xs text-slate-500">{review.arrivalCity}</p>
                      {review.arrivalTerminal && (
                        <p className="text-xs text-slate-400">{review.arrivalTerminal}</p>
                      )}
                    </div>
                  </div>

                  {review.segments.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Segments</p>
                      {review.segments.map((seg, i) => (
                        <p key={i} className="text-xs text-slate-600">
                          {seg.airlineCode} {seg.flightNumber}: {seg.departureAirportCode} →{" "}
                          {seg.arrivalAirportCode} ({seg.departureTime}–{seg.arrivalTime})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-800">Passengers:</span>{" "}
                      {context?.params.adults ?? 1} Adult
                      {(context?.params.children ?? 0) > 0
                        ? `, ${context?.params.children} Child`
                        : ""}
                      {(context?.params.infants ?? 0) > 0
                        ? `, ${context?.params.infants} Infant`
                        : ""}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Cabin:</span>{" "}
                      {review.cabinClass.replace(/_/g, " ")}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Baggage:</span> Cabin{" "}
                      {review.cabinBaggage}, Check-in {review.checkinBaggage}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Refund:</span>{" "}
                      {review.refundableType}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-blue-100 bg-blue-50/50">
                <CardContent className="pt-5 text-sm text-blue-900">
                  Fare is subject to validation before payment.
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="sticky top-24 rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <p className="font-semibold text-slate-900">Fare breakdown</p>

                  {review.paxFares.map((line) => (
                    <div key={line.type} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {line.type} × {line.count}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(line.totalFare * line.count, locale)}
                      </span>
                    </div>
                  ))}

                  <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Base fare</span>
                      <span>{formatCurrency(review.baseFare, locale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taxes & fees</span>
                      <span>{formatCurrency(review.taxesAndFees, locale)}</span>
                    </div>
                    {review.netFare > 0 && review.netFare !== review.totalFare && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Net fare</span>
                        <span>{formatCurrency(review.netFare, locale)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-[#1a4fa3]">
                      <span>Total</span>
                      <span>{formatCurrency(review.totalFare, locale)}</span>
                    </div>
                  </div>

                  {review.seatsRemaining != null && (
                    <p className="text-xs text-amber-700">
                      {review.seatsRemaining} seat(s) remaining
                    </p>
                  )}

                  <Button
                    className="w-full bg-[#1a4fa3] hover:bg-[#16408a]"
                    onClick={onContinue}
                  >
                    Continue to passenger details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Link href="/flights" className="block w-full">
                    <Button variant="outline" className="w-full" type="button">
                      Back to results
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
