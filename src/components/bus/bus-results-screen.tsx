"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bus, Loader2, MapPin, Star, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";
import type { BusSearchParams } from "@/lib/bus/session";
import type { BusSelectedTrip } from "@/lib/bus/session";

interface BusResultsScreenProps {
  search: BusSearchParams;
  trips: BusSelectedTrip[];
  loading: boolean;
  error: string | null;
  message: string;
  locale: Locale;
  onSelectTrip: (trip: BusSelectedTrip) => void;
}

function tripFare(trip: BusSelectedTrip): number {
  if (trip.startingFare && trip.startingFare > 0) return trip.startingFare;
  if (trip.fareDetails?.length) return trip.fareDetails[0].totalFare;
  if (Array.isArray(trip.fares) && trip.fares.length) return Number(trip.fares[0]);
  return 0;
}

export function BusResultsScreen({
  search,
  trips,
  loading,
  error,
  message,
  locale,
  onSelectTrip,
}: BusResultsScreenProps) {
  const routeLabel = `${search.sourceCityName || "—"} → ${search.destinationCityName || "—"}`;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b bg-[#1a4fa3] text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link
              href="/bus/search"
              className="mb-1 inline-flex items-center text-sm text-blue-100 hover:text-white"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Modify search
            </Link>
            <h1 className="text-xl font-bold md:text-2xl">{routeLabel}</h1>
            <p className="text-sm text-blue-100">
              {search.doj} · {loading ? "Searching..." : `${trips.length} buses found`}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2 text-sm">Sort: Departure Time</div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-4 lg:block">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 pt-5">
              <p className="font-semibold text-slate-900">Bus Type</p>
              {["AC Seater", "Non AC Seater", "AC Sleeper", "Non AC Sleeper"].map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" readOnly />
                  {type}
                </label>
              ))}
              <p className="pt-2 font-semibold text-slate-900">Departure Time</p>
              <input type="range" className="w-full" readOnly />
              <p className="pt-2 font-semibold text-slate-900">Amenities</p>
              {["Wi-Fi", "Charging Point", "Blanket", "Water Bottle"].map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300" readOnly />
                  {a}
                </label>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {message && !loading && (
            <p className="text-sm text-slate-600">{message}</p>
          )}
          {loading && (
            <Card className="rounded-2xl">
              <CardContent className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-[#1a4fa3]" />
                Searching buses...
              </CardContent>
            </Card>
          )}
          {error && (
            <Card className="rounded-2xl border-red-200">
              <CardContent className="py-6 text-sm text-red-600">{error}</CardContent>
            </Card>
          )}
          {!loading && !error && trips.length === 0 && (
            <Card className="rounded-2xl">
              <CardContent className="py-16 text-center text-slate-500">
                No buses found for this route/date. Please try another date.
              </CardContent>
            </Card>
          )}
          {!loading &&
            trips.map((trip) => {
              const fare = tripFare(trip);
              return (
                <Card
                  key={String(trip.id)}
                  className="overflow-hidden rounded-2xl border-slate-200 shadow-sm transition hover:shadow-md"
                >
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1a4fa3]">
                        <Bus className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {trip.travels ?? trip.operator}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            4.3
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{trip.busType}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-slate-900">{trip.departureTime}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-slate-900">{trip.arrivalTime}</span>
                          {trip.duration && (
                            <Badge variant="secondary" className="bg-blue-50 text-[#1a4fa3]">
                              {trip.duration}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {trip.AC && (
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                              AC
                            </Badge>
                          )}
                          {trip.sleeper && (
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                              Sleeper
                            </Badge>
                          )}
                          {trip.seater && (
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                              Seater
                            </Badge>
                          )}
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                            <Wifi className="mr-1 h-3 w-3" />
                            Wi-Fi
                          </Badge>
                        </div>
                        <p className="mt-2 flex items-center text-xs text-emerald-600">
                          <MapPin className="mr-1 h-3.5 w-3.5" />
                          {trip.availableSeats} seats left
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <p className="text-xs text-slate-500">Starting from</p>
                        <p className="text-2xl font-bold text-[#1a4fa3]">
                          {fare > 0 ? formatCurrency(fare, locale) : "View fare"}
                        </p>
                      </div>
                      <Button
                        className="rounded-xl bg-[#1a4fa3] px-6 hover:bg-[#163f85]"
                        onClick={() => onSelectTrip(trip)}
                      >
                        View Seats
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
