"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Info,
  Loader2,
  Luggage,
  Plane,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AirlineAvatar,
  FlightPageHeader,
  FlightRouteStrip,
  FlightSoftCard,
  FlightStepBar,
  flightPrimaryButtonClass,
} from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import type { NormalizedFlightReview } from "@/lib/tripjack/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

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
      <div className="min-h-screen bg-[#f4f7fb] py-16">
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
    <div className="min-h-screen bg-[#f4f7fb]">
      <FlightStepBar current="review" />
      <FlightPageHeader
        title="Review Fare"
        subtitle={`${routeLabel}${context?.params.departureDate ? ` · ${context.params.departureDate}` : ""}`}
        backHref="/flights"
        backLabel="Back to results"
      />

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <FlightSoftCard>
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a4fa3]" />
              <p className="text-slate-700">Fetching latest fare from airline...</p>
            </div>
          </FlightSoftCard>
        )}

        {error && !loading && (
          <FlightSoftCard className="border-red-200 bg-red-50">
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Review failed</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          </FlightSoftCard>
        )}

        {review && !loading && !error && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {review.fareUpdated && (
                <FlightSoftCard className="border-amber-200 bg-amber-50">
                  <div className="p-4 text-sm text-amber-900">
                    {review.fareAlertMessage ??
                      "Fare updated by airline. Please review the latest fare."}
                  </div>
                </FlightSoftCard>
              )}

              <FlightSoftCard>
                <div className="space-y-5 p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AirlineAvatar
                        code={review.airlineCode}
                        name={review.airlineName}
                        logoUrl={review.airlineLogoUrl}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{review.airlineName}</p>
                        <p className="text-sm text-slate-500">
                          {review.airlineCode} {review.flightNumber}
                          {review.isLcc ? " · LCC" : ""}
                        </p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-blue-50 text-[#1a4fa3] hover:bg-blue-50">
                      {review.fareIdentifier}
                    </Badge>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <FlightRouteStrip
                      departureTime={review.departureTime}
                      arrivalTime={review.arrivalTime}
                      fromCode={review.departureAirportCode}
                      toCode={review.arrivalAirportCode}
                      fromCity={review.departureCity}
                      toCity={review.arrivalCity}
                      duration={review.durationFormatted}
                      stopsLabel={
                        review.stops === 0
                          ? "Non Stop"
                          : review.stops === 1
                            ? "1 Stop"
                            : `${review.stops} Stops`
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
                      <Briefcase className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Cabin</p>
                        <p className="text-xs text-slate-500">{review.cabinBaggage}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
                      <Luggage className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Check-in</p>
                        <p className="text-xs text-slate-500">{review.checkinBaggage}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 p-3">
                      <RefreshCw className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Refund</p>
                        <p className="text-xs text-slate-500">{review.refundableType}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FlightSoftCard>

              <FlightSoftCard className="border-blue-100 bg-blue-50/60">
                <div className="flex items-start gap-2 p-4 text-sm text-blue-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  Fare is valid for a limited time only. Final amount is confirmed after fare
                  validation.
                </div>
              </FlightSoftCard>
            </div>

            <div className="space-y-4">
              <FlightSoftCard className="sticky top-24">
                <div className="space-y-4 p-5 md:p-6">
                  <p className="text-lg font-bold text-slate-900">Fare Summary</p>

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
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-[#1a4fa3]">
                      <span>Total</span>
                      <span>{formatCurrency(review.totalFare, locale)}</span>
                    </div>
                  </div>

                  <Button className={cn(flightPrimaryButtonClass())} onClick={onContinue}>
                    Continue to Passenger Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Link href="/flights" className="block w-full">
                    <Button variant="outline" className="h-11 w-full rounded-xl" type="button">
                      Back to results
                    </Button>
                  </Link>
                </div>
              </FlightSoftCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
