"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlightPageHeader,
  FlightSoftCard,
  FlightStepBar,
  FlightSuccessPanel,
  flightPrimaryButtonClass,
} from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type {
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightReview,
  PassengerTitle,
  PassengerType,
} from "@/lib/tripjack/types";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

const TITLES: PassengerTitle[] = ["Mr", "Ms", "Mrs", "Mstr", "Miss"];

interface FlightPassengersScreenProps {
  review: NormalizedFlightReview | null;
  context: FlightSearchContext | null;
  bookingId: string;
  passengers: FlightPassengerFormRow[];
  delivery: FlightPassengerDeliveryForm;
  validated: NormalizedFareValidate | null;
  loading: boolean;
  error: string | null;
  bookingIdError: string | null;
  locale: Locale;
  onPassengerChange: (index: number, patch: Partial<FlightPassengerFormRow>) => void;
  onDeliveryChange: (patch: Partial<FlightPassengerDeliveryForm>) => void;
  onValidate: () => void;
  onRetry: () => void;
  onProceedToPayment: () => void;
}

function passengerLabel(pt: PassengerType, index: number): string {
  if (pt === "ADULT") return `Adult ${index + 1}`;
  if (pt === "CHILD") return `Child ${index + 1}`;
  return `Infant ${index + 1}`;
}

export function FlightPassengersScreen({
  review,
  context,
  bookingId,
  passengers,
  delivery,
  validated,
  loading,
  error,
  bookingIdError,
  locale,
  onPassengerChange,
  onDeliveryChange,
  onValidate,
  onRetry,
  onProceedToPayment,
}: FlightPassengersScreenProps) {
  if (!review || !context) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] py-16 text-center">
        <p className="font-semibold text-slate-900">Flight review data missing.</p>
        <p className="mt-2 text-sm text-slate-600">Please complete review before passenger details.</p>
        <Link href="/flights" className="mt-6 inline-block text-[#1a4fa3] hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const reviewTotal = review.totalFare;
  const displayTotal = validated?.totalFare ?? reviewTotal;

  if (validated) {
    return (
      <div className="min-h-screen bg-[#f4f7fb]">
        <FlightStepBar current="passengers" />
        <FlightPageHeader
          title="Fare Validated"
          subtitle={`${context.params.fromCode} → ${context.params.toCode} · ${context.params.departureDate}`}
          backHref="/flights/review"
          backLabel="Back to review"
        />
        <div className="container mx-auto px-4 py-12">
          <FlightSuccessPanel
            title="Fare Validated Successfully"
            description="Your fare and seats are confirmed. Proceed to secure payment."
          >
            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking reference</span>
                <span className="font-mono font-semibold text-slate-900">
                  {validated.bookingId || bookingId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total payable</span>
                <span className="text-lg font-bold text-[#1a4fa3]">
                  {formatCurrency(displayTotal, locale)}
                </span>
              </div>
              {validated.fareChanged && validated.fareAlertMessage && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  {validated.fareAlertMessage}
                </p>
              )}
            </div>
            <Button
              className={cn(flightPrimaryButtonClass(), "mt-6")}
              onClick={onProceedToPayment}
            >
              Proceed to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </FlightSuccessPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <FlightStepBar current="passengers" />
      <FlightPageHeader
        title="Passenger Details"
        subtitle={`${context.params.fromCode} → ${context.params.toCode} · ${context.params.departureDate}`}
        backHref="/flights/review"
        backLabel="Back to review"
      />

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {bookingIdError && (
            <FlightSoftCard className="border-red-200 bg-red-50">
              <div className="flex items-start gap-3 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {bookingIdError}
              </div>
            </FlightSoftCard>
          )}

          <FlightSoftCard>
            <div className="space-y-4 p-5 md:p-6">
              <p className="text-lg font-bold text-slate-900">Contact details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-2 h-11 rounded-xl bg-slate-50"
                    type="email"
                    value={delivery.email}
                    onChange={(e) => onDeliveryChange({ email: e.target.value })}
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      className="h-11 w-20 rounded-xl bg-slate-50"
                      value={delivery.countryCode}
                      onChange={(e) => onDeliveryChange({ countryCode: e.target.value })}
                    />
                    <Input
                      className="h-11 flex-1 rounded-xl bg-slate-50"
                      value={delivery.contact}
                      onChange={(e) => onDeliveryChange({ contact: e.target.value })}
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>
            </div>
          </FlightSoftCard>

          {passengers.map((passenger, index) => {
            const typeIndex =
              passengers.slice(0, index + 1).filter((p) => p.pt === passenger.pt).length - 1;

            return (
              <FlightSoftCard key={`${passenger.pt}-${index}`}>
                <div className="space-y-4 p-5 md:p-6">
                  <p className="text-lg font-bold text-slate-900">
                    {passengerLabel(passenger.pt, typeIndex)}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Title</Label>
                      <Select
                        value={passenger.ti}
                        onValueChange={(v) => {
                          if (v) onPassengerChange(index, { ti: v as PassengerTitle });
                        }}
                      >
                        <SelectTrigger className="mt-2 h-11 rounded-xl bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TITLES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50"
                        value={passenger.pt}
                        readOnly
                      />
                    </div>
                    <div>
                      <Label>First name</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50 uppercase"
                        value={passenger.fN}
                        onChange={(e) => onPassengerChange(index, { fN: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50 uppercase"
                        value={passenger.lN}
                        onChange={(e) => onPassengerChange(index, { lN: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select
                        value={passenger.gender || "male"}
                        onValueChange={(v) => {
                          if (v) onPassengerChange(index, { gender: v });
                        }}
                      >
                        <SelectTrigger className="mt-2 h-11 rounded-xl bg-slate-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date of birth</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50"
                        type="date"
                        value={passenger.dateOfBirth}
                        onChange={(e) => onPassengerChange(index, { dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Nationality</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50"
                        value={passenger.nationality}
                        onChange={(e) => onPassengerChange(index, { nationality: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Passport (optional)</Label>
                      <Input
                        className="mt-2 h-11 rounded-xl bg-slate-50"
                        value={passenger.passportNumber}
                        onChange={(e) =>
                          onPassengerChange(index, { passportNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </FlightSoftCard>
            );
          })}

          {error && !loading && (
            <FlightSoftCard className="border-red-200 bg-red-50">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-red-800">{error}</p>
                <Button variant="outline" onClick={onRetry}>
                  Retry validation
                </Button>
              </div>
            </FlightSoftCard>
          )}

          {!bookingIdError && (
            <Button
              className={cn(flightPrimaryButtonClass())}
              disabled={loading}
              onClick={onValidate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating fare...
                </>
              ) : (
                "Validate Fare & Continue"
              )}
            </Button>
          )}
        </div>

        <aside>
          <FlightSoftCard className="sticky top-24">
            <div className="space-y-3 p-5 md:p-6">
              <p className="text-lg font-bold text-slate-900">Fare summary</p>
              <p className="text-sm text-slate-600">
                {review.airlineName} · {review.airlineCode} {review.flightNumber}
              </p>
              <p className="text-sm text-slate-600">
                {review.departureAirportCode} → {review.arrivalAirportCode}
              </p>
              <p className="text-sm text-slate-600">
                {review.departureTime} – {review.arrivalTime} · {review.durationFormatted}
              </p>
              <div className="border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Review fare</span>
                  <span>{formatCurrency(reviewTotal, locale)}</span>
                </div>
                <div className="mt-2 flex justify-between text-slate-600">
                  <span>Base</span>
                  <span>{formatCurrency(review.baseFare, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & fees</span>
                  <span>{formatCurrency(review.taxesAndFees, locale)}</span>
                </div>
              </div>
              {bookingId && (
                <p className="text-[10px] text-slate-400">Booking ref: {bookingId}</p>
              )}
            </div>
          </FlightSoftCard>
        </aside>
      </div>
    </div>
  );
}
