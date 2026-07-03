"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}: FlightPassengersScreenProps) {
  if (!review || !context) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 text-center">
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-[#1a4fa3] text-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/flights/review"
            className="mb-2 inline-flex items-center text-sm text-blue-100 hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to review
          </Link>
          <h1 className="text-2xl font-bold">Passenger details</h1>
          <p className="text-sm text-blue-100">
            {context.params.fromCode} → {context.params.toCode} · {context.params.departureDate}
          </p>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {bookingIdError && (
            <Card className="rounded-2xl border-red-200 bg-red-50">
              <CardContent className="flex items-start gap-3 pt-5 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {bookingIdError}
              </CardContent>
            </Card>
          )}

          {validated?.fareChanged && validated.fareAlertMessage && (
            <Card className="rounded-2xl border-amber-200 bg-amber-50">
              <CardContent className="pt-5 text-sm text-amber-900">
                {validated.fareAlertMessage}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 pt-6">
              <p className="font-semibold text-slate-900">Contact details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-2"
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
                      className="w-20"
                      value={delivery.countryCode}
                      onChange={(e) => onDeliveryChange({ countryCode: e.target.value })}
                    />
                    <Input
                      className="flex-1"
                      value={delivery.contact}
                      onChange={(e) => onDeliveryChange({ contact: e.target.value })}
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {passengers.map((passenger, index) => {
            const typeIndex = passengers
              .slice(0, index + 1)
              .filter((p) => p.pt === passenger.pt).length - 1;

            return (
              <Card key={`${passenger.pt}-${index}`} className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <p className="font-semibold text-slate-900">
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
                        <SelectTrigger className="mt-2">
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
                      <Input className="mt-2 bg-slate-50" value={passenger.pt} readOnly />
                    </div>
                    <div>
                      <Label>First name</Label>
                      <Input
                        className="mt-2 uppercase"
                        value={passenger.fN}
                        onChange={(e) => onPassengerChange(index, { fN: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Last name</Label>
                      <Input
                        className="mt-2 uppercase"
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
                        <SelectTrigger className="mt-2">
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
                        className="mt-2"
                        type="date"
                        value={passenger.dateOfBirth}
                        onChange={(e) => onPassengerChange(index, { dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Nationality</Label>
                      <Input
                        className="mt-2"
                        value={passenger.nationality}
                        onChange={(e) => onPassengerChange(index, { nationality: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Passport (optional)</Label>
                      <Input
                        className="mt-2"
                        value={passenger.passportNumber}
                        onChange={(e) =>
                          onPassengerChange(index, { passportNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {error && !loading && (
            <Card className="rounded-2xl border-red-200 bg-red-50">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-red-800">{error}</p>
                <Button variant="outline" onClick={onRetry}>
                  Retry validation
                </Button>
              </CardContent>
            </Card>
          )}

          {!bookingIdError && (
            <Button
              className="h-12 w-full rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
              disabled={loading || Boolean(validated)}
              onClick={onValidate}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating fare...
                </>
              ) : validated ? (
                "Fare validated"
              ) : (
                "Validate Fare & Continue"
              )}
            </Button>
          )}
        </div>

        <aside>
          <Card className="sticky top-24 rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-3 pt-6">
              <p className="font-semibold text-slate-900">Fare summary</p>
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
                {validated && (
                  <div className="mt-2 flex justify-between font-semibold text-[#1a4fa3]">
                    <span>Validated fare</span>
                    <span>{formatCurrency(displayTotal, locale)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between text-slate-600">
                  <span>Base</span>
                  <span>{formatCurrency(validated?.baseFare ?? review.baseFare, locale)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & fees</span>
                  <span>{formatCurrency(validated?.taxesAndFees ?? review.taxesAndFees, locale)}</span>
                </div>
              </div>
              {bookingId && (
                <p className="text-[10px] text-slate-400">Booking ref: {bookingId}</p>
              )}
              <p className="text-xs text-slate-500">
                Fare is subject to validation before payment.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
