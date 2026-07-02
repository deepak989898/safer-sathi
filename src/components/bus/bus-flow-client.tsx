"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bus,
  Clock,
  Loader2,
  MapPin,
  Shield,
} from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { BusSeatLayout } from "@/components/bus/bus-seat-layout";
import { Badge } from "@/components/ui/badge";
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
import { useBusBookingApi } from "@/hooks/use-bus-booking";
import {
  filterCities,
  loadBusSession,
  saveBusSession,
  type BusBookingSession,
  type BusSearchParams,
} from "@/lib/bus/session";
import { formatCurrency } from "@/lib/i18n";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { BusCityRecord } from "@/lib/seatseller/types";
import type { BusPassengerDetail, SeatSellerSeat } from "@/lib/seatseller/types";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type BusFlowStep =
  | "search"
  | "results"
  | "seat-layout"
  | "passenger-details"
  | "payment";

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function BlockTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Expired");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <Badge variant={remaining === "Expired" ? "destructive" : "secondary"}>
      <Clock className="mr-1 h-3 w-3" />
      Block expires in {remaining}
    </Badge>
  );
}

export function BusFlowClient({ step }: { step: BusFlowStep }) {
  const router = useRouter();
  const { locale } = useAppStore();
  const api = useBusBookingApi();

  const [cities, setCities] = useState<BusCityRecord[]>([]);
  const [session, setSession] = useState<BusBookingSession | null>(null);
  const [search, setSearch] = useState<BusSearchParams>({
    sourceCityId: "",
    sourceCityName: "",
    destinationCityId: "",
    destinationCityName: "",
    doj: tomorrowIso(),
  });
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);
  const [trips, setTrips] = useState<BusBookingSession["trip"][]>([]);
  const [tripDetails, setTripDetails] = useState<{
    seats: SeatSellerSeat[];
    maxSeatsPerTicket: number;
    forcedSeats?: string[];
  } | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatSellerSeat[]>([]);
  const [bpdp, setBpdp] = useState<{
    boardingPoints: Array<{ id: string; location: string; time: string }>;
    droppingPoints: Array<{ id: string; location: string; time: string }>;
  } | null>(null);
  const [boardingId, setBoardingId] = useState("");
  const [droppingId, setDroppingId] = useState("");
  const [passengers, setPassengers] = useState<BusPassengerDetail[]>([]);

  const isBpDpSeatLayoutEnabled = (value: unknown): boolean =>
    value === true || String(value).toLowerCase() === "true";

  useEffect(() => {
    void api.fetchCities().then((data) => data && setCities(data));
    const saved = loadBusSession();
    if (!saved) return;
    setSession(saved);
    setSearch(saved.search);
    if (saved.selectedSeats?.length) setSelectedSeats(saved.selectedSeats);
    if (saved.passengers?.length) setPassengers(saved.passengers);
    if (saved.boardingPoint) setBoardingId(saved.boardingPoint.id);
    if (saved.droppingPoint) setDroppingId(saved.droppingPoint.id);
  }, []);

  useEffect(() => {
    if (step !== "results" || !search.sourceCityId) return;
    void api
      .searchTrips({
        source: search.sourceCityId,
        destination: search.destinationCityId,
        doj: search.doj,
      })
      .then((data) => data && setTrips(data.trips));
  }, [step, search.sourceCityId, search.destinationCityId, search.doj]);

  const fromCities = useMemo(() => filterCities(cities, fromQuery), [cities, fromQuery]);
  const toCities = useMemo(() => filterCities(cities, toQuery), [cities, toQuery]);

  const handleSearch = async () => {
    if (!search.sourceCityId || !search.destinationCityId || !search.doj) {
      if (!search.sourceCityId) setFromError("Please select a valid source city from dropdown");
      if (!search.destinationCityId) {
        setToError("Please select a valid destination city from dropdown");
      }
      toast.error("Please select valid source, destination and date");
      return;
    }
    setFromError(null);
    setToError(null);

    const requestBody = {
      source: search.sourceCityId,
      destination: search.destinationCityId,
      doj: search.doj.slice(0, 10),
      sourceName: search.sourceCityName,
      destinationName: search.destinationCityName,
    };
    if (process.env.NODE_ENV !== "production") {
      console.log("[bus-search] selected city IDs", {
        sourceCityId: requestBody.source,
        destinationCityId: requestBody.destination,
      });
      console.log("[bus-search] request body", requestBody);
    }

    const result = await api.searchTrips({
      ...requestBody,
    });
    if (!result) {
      toast.error(api.error ?? "Trip search failed. Please try again.");
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[bus-search] response count", result.count);
    }
    setTrips(result.trips);
    toast.message(result.message || "Search completed");
    router.push("/bus/results");
  };

  const swapSourceDestination = () => {
    setSearch((prev) => ({
      ...prev,
      sourceCityId: prev.destinationCityId,
      sourceCityName: prev.destinationCityName,
      destinationCityId: prev.sourceCityId,
      destinationCityName: prev.sourceCityName,
    }));
    setFromQuery("");
    setToQuery("");
    setShowFromDropdown(false);
    setShowToDropdown(false);
  };

  const selectTrip = async (trip: BusBookingSession["trip"]) => {
    const next: BusBookingSession = {
      search,
      trip,
      selectedSeats: [],
    };
    saveBusSession(next);
    setSession(next);
    router.push("/bus/seat-layout");
  };

  useEffect(() => {
    if (step !== "seat-layout" || !session?.trip) return;
    void (async () => {
      const [details, points] = await Promise.all([
        api.fetchTripDetails({
          tripId: String(session.trip.id),
        }),
        api.fetchBpDp(String(session.trip.id)),
      ]);
      if (details) {
        setTripDetails({
          seats: details.seats,
          maxSeatsPerTicket: details.maxSeatsPerTicket,
          forcedSeats: details.forcedSeats,
        });
      }
      if (points) setBpdp(points);
    })();
  }, [step, session?.trip?.id]);

  useEffect(() => {
    if (
      step !== "seat-layout" ||
      !session?.trip ||
      !boardingId ||
      !droppingId ||
      !isBpDpSeatLayoutEnabled(session.trip.bpDpSeatLayout)
    ) {
      return;
    }

    void api
      .fetchTripDetails({
        tripId: String(session.trip.id),
        bpId: boardingId,
        dpId: droppingId,
        bpDpSeatLayout: true,
      })
      .then((details) => {
        if (!details) return;
        setTripDetails({
          seats: details.seats,
          maxSeatsPerTicket: details.maxSeatsPerTicket,
          forcedSeats: details.forcedSeats,
        });
      });
  }, [step, session?.trip?.id, session?.trip?.bpDpSeatLayout, boardingId, droppingId]);

  const toggleSeat = (seat: SeatSellerSeat) => {
    if (!tripDetails) return;
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.name === seat.name);
      if (exists) return prev.filter((s) => s.name !== seat.name);
      if (prev.length >= tripDetails.maxSeatsPerTicket) {
        toast.error(`Maximum ${tripDetails.maxSeatsPerTicket} seats per ticket`);
        return prev;
      }
      return [...prev, seat];
    });
  };

  const continueToPassengers = () => {
    if (!session?.trip || selectedSeats.length === 0) {
      toast.error("Select at least one seat");
      return;
    }
    if (!boardingId || !droppingId || !bpdp) {
      toast.error("Select boarding and dropping points");
      return;
    }
    const boarding = bpdp.boardingPoints.find((b) => b.id === boardingId)!;
    const dropping = bpdp.droppingPoints.find((d) => d.id === droppingId)!;
    const next: BusBookingSession = {
      ...session,
      selectedSeats,
      boardingPoint: boarding,
      droppingPoint: dropping,
      passengers: selectedSeats.map((seat) => ({
        title: "Mr",
        name: "",
        age: 30,
        gender: seat.ladiesSeat ? "FEMALE" : "MALE",
        mobile: "",
        email: "",
        idType: "AADHAR",
        idNumber: "",
        address: "",
        seatName: seat.name,
        ladiesSeat: Boolean(seat.ladiesSeat),
        fare: seat.fare ?? 0,
      })),
    };
    saveBusSession(next);
    setSession(next);
    setPassengers(next.passengers ?? []);
    router.push("/bus/passenger-details");
  };

  const submitPassengers = async () => {
    if (!session?.trip || !session.boardingPoint || !session.droppingPoint) return;
    for (const p of passengers) {
      if (!p.name || !p.mobile || !p.email || !p.idNumber) {
        toast.error("Fill all passenger details");
        return;
      }
      const seat = selectedSeats.find((s) => s.name === p.seatName);
      if (seat?.ladiesSeat && p.gender !== "FEMALE") {
        toast.error(`Seat ${p.seatName} is for female passengers only`);
        return;
      }
      if (seat?.malesSeat && p.gender !== "MALE") {
        toast.error(`Seat ${p.seatName} is for male passengers only`);
        return;
      }
    }

    const result = await api.blockTicket({
      sourceCityId: session.search.sourceCityId,
      sourceCityName: session.search.sourceCityName,
      destinationCityId: session.search.destinationCityId,
      destinationCityName: session.search.destinationCityName,
      doj: session.search.doj,
      tripId: String(session.trip.id),
      operatorName: session.trip.travels ?? session.trip.operator ?? "Bus",
      busType: session.trip.busType,
      boardingPoint: session.boardingPoint,
      droppingPoint: session.droppingPoint,
      passengers,
      callFareBreakupApi: session.trip.callFareBreakupApi,
      cancellationPolicy: session.trip.cancellationPolicy,
    });

    if (!result) return;
    const next: BusBookingSession = {
      ...session,
      passengers,
      bookingId: result.booking.bookingId,
      blockExpiresAt: result.blockExpiresAt,
    };
    saveBusSession(next);
    setSession(next);
    router.push(`/bus/payment?bookingId=${result.booking.bookingId}`);
  };

  const payNow = async () => {
    const bookingId = session?.bookingId ?? new URLSearchParams(window.location.search).get("bookingId");
    if (!bookingId || !passengers[0]) return;

    const res = await fetch(`/api/bus/bookings/${bookingId}`);
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Booking not found");
      return;
    }

    const payResult = await api.payForBooking(json.data.booking, {
      name: passengers[0].name,
      email: passengers[0].email,
      phone: passengers[0].mobile,
    });

    if (!payResult) return;
    if (payResult.manualReview) {
      toast.warning(payResult.message);
    } else {
      toast.success("Bus ticket confirmed!");
    }
    router.push(`/bus/ticket/${bookingId}`);
  };

  if (step === "search") {
    return (
      <>
        <PageHero
          title="Bus Booking"
          subtitle="Search AC, sleeper & seater buses across India"
          image={HERO_IMAGES.bus}
        />
        <section className="container mx-auto px-4 py-10">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label>From</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Search city"
                  value={fromQuery || search.sourceCityName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFromQuery(value);
                    // User edited text manually; require fresh dropdown selection.
                    setSearch((s) => ({ ...s, sourceCityId: "", sourceCityName: value }));
                    setFromError(null);
                    void api.fetchCities(value).then((data) => data && setCities(data));
                  }}
                  onFocus={() => {
                    setShowFromDropdown(true);
                    setShowToDropdown(false);
                    void api
                      .fetchCities(fromQuery || search.sourceCityName)
                      .then((data) => data && setCities(data));
                  }}
                  onClick={() => {
                    setShowFromDropdown(true);
                    setShowToDropdown(false);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!search.sourceCityId && (fromQuery || search.sourceCityName)) {
                        setFromError("Please choose a valid city from suggestions");
                      }
                    }, 120);
                  }}
                />
                {showFromDropdown && (
                  <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-background shadow-sm">
                    {fromCities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSearch((s) => ({
                            ...s,
                            sourceCityId: c.id,
                            sourceCityName: c.name,
                          }));
                          setFromQuery("");
                          setFromError(null);
                          setShowFromDropdown(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {fromError && <p className="mt-1 text-xs text-destructive">{fromError}</p>}
              </div>
              <div className="flex items-end justify-center lg:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={swapSourceDestination}
                  title="Swap From and To"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label>To</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Search city"
                  value={toQuery || search.destinationCityName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setToQuery(value);
                    // User edited text manually; require fresh dropdown selection.
                    setSearch((s) => ({
                      ...s,
                      destinationCityId: "",
                      destinationCityName: value,
                    }));
                    setToError(null);
                    void api.fetchCities(value).then((data) => data && setCities(data));
                  }}
                  onFocus={() => {
                    setShowToDropdown(true);
                    setShowFromDropdown(false);
                    void api
                      .fetchCities(toQuery || search.destinationCityName)
                      .then((data) => data && setCities(data));
                  }}
                  onClick={() => {
                    setShowToDropdown(true);
                    setShowFromDropdown(false);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!search.destinationCityId && (toQuery || search.destinationCityName)) {
                        setToError("Please choose a valid city from suggestions");
                      }
                    }, 120);
                  }}
                />
                {showToDropdown && (
                  <div className="mt-1 max-h-40 overflow-auto rounded-md border bg-background shadow-sm">
                    {toCities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setSearch((s) => ({
                            ...s,
                            destinationCityId: c.id,
                            destinationCityName: c.name,
                          }));
                          setToQuery("");
                          setToError(null);
                          setShowToDropdown(false);
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {toError && <p className="mt-1 text-xs text-destructive">{toError}</p>}
              </div>
              <div>
                <Label>Journey date</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  min={new Date().toISOString().slice(0, 10)}
                  value={search.doj}
                  onChange={(e) => setSearch((s) => ({ ...s, doj: e.target.value }))}
                />
              </div>
              <div className="flex items-end lg:col-span-2">
                <Button className="w-full" onClick={() => void handleSearch()} disabled={api.loading}>
                  {api.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search Buses
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  if (step === "results") {
    return (
      <section className="container mx-auto px-4 py-8">
        <Link
          href="/bus/search"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Modify search
        </Link>
        <h1 className="text-2xl font-bold">Available buses</h1>
        <p className="text-muted-foreground">
          {search.sourceCityName} → {search.destinationCityName} · {search.doj}
        </p>
        <div className="mt-6 space-y-4">
          {api.error && (
            <Card>
              <CardContent className="py-4 text-sm text-destructive">{api.error}</CardContent>
            </Card>
          )}
          {trips.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No buses found for this route/date. Please try another date.
              </CardContent>
            </Card>
          )}
          {trips.map((trip) => (
            <Card key={String(trip.id)} className="hover:shadow-md">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{trip.travels ?? trip.operator}</p>
                    <p className="text-sm text-muted-foreground">{trip.busType}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {trip.AC && <Badge variant="secondary">AC</Badge>}
                      {trip.sleeper && <Badge variant="secondary">Sleeper</Badge>}
                      {trip.seater && <Badge variant="secondary">Seater</Badge>}
                      {trip.mTicketEnabled && <Badge variant="outline">mTicket</Badge>}
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{trip.departureTime}</span>
                  <ArrowRight className="mx-2 inline h-4 w-4" />
                  <span className="font-medium">{trip.arrivalTime}</span>
                  {trip.duration && (
                    <Badge variant="secondary" className="ml-2">
                      {trip.duration}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  {trip.availableSeats} seats left
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(trip.startingFare ?? 0, locale)}
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => void selectTrip(trip)}>
                    Select seats
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (step === "seat-layout") {
    return (
      <section className="container mx-auto px-4 py-8">
        <Link
          href="/bus/results"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to buses
        </Link>
        <h1 className="text-xl font-bold">{session?.trip?.travels ?? "Select seats"}</h1>
        {api.loading && !tripDetails ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tripDetails ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardContent className="pt-6">
                <BusSeatLayout
                  seats={tripDetails.seats}
                  selected={selectedSeats}
                  maxSeats={tripDetails.maxSeatsPerTicket}
                  onToggle={toggleSeat}
                />
              </CardContent>
            </Card>
            <Card className="h-fit lg:sticky lg:top-24">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label>Boarding point</Label>
                  <Select value={boardingId} onValueChange={(v) => setBoardingId(v ?? "")}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select boarding" />
                    </SelectTrigger>
                    <SelectContent>
                      {bpdp?.boardingPoints.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.time} — {b.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dropping point</Label>
                  <Select value={droppingId} onValueChange={(v) => setDroppingId(v ?? "")}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select dropping" />
                    </SelectTrigger>
                    <SelectContent>
                      {bpdp?.droppingPoints.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.time} — {d.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={selectedSeats.length === 0}
                  onClick={continueToPassengers}
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    );
  }

  if (step === "passenger-details") {
    return (
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold">Passenger details</h1>
        <div className="mt-6 space-y-6">
          {passengers.map((p, index) => (
            <Card key={p.seatName}>
              <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
                <p className="md:col-span-2 font-medium">Seat {p.seatName}</p>
                <div>
                  <Label>Title</Label>
                  <Select
                    value={p.title}
                    onValueChange={(v) =>
                      setPassengers((list) =>
                        list.map((row, i) => (i === index ? { ...row, title: v ?? "Mr" } : row))
                      )
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mr", "Mrs", "Ms"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input
                    className="mt-1.5"
                    value={p.name}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, name: e.target.value } : row
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={p.age}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, age: Number(e.target.value) } : row
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={p.gender}
                    onValueChange={(v) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index
                            ? { ...row, gender: (v ?? "MALE") as "MALE" | "FEMALE" }
                            : row
                        )
                      )
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    className="mt-1.5"
                    value={p.mobile}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, mobile: e.target.value } : row
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    className="mt-1.5"
                    value={p.email}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, email: e.target.value } : row
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label>ID type</Label>
                  <Select
                    value={p.idType}
                    onValueChange={(v) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                idType: (v ?? "AADHAR") as BusPassengerDetail["idType"],
                              }
                            : row
                        )
                      )
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "AADHAR",
                        "PAN_CARD",
                        "PASSPORT",
                        "DRIVING_LICENCE",
                        "VOTER_CARD",
                        "RATION_CARD",
                      ].map((id) => (
                        <SelectItem key={id} value={id}>
                          {id.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ID number</Label>
                  <Input
                    className="mt-1.5"
                    value={p.idNumber}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, idNumber: e.target.value } : row
                        )
                      )
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    className="mt-1.5"
                    value={p.address}
                    onChange={(e) =>
                      setPassengers((list) =>
                        list.map((row, i) =>
                          i === index ? { ...row, address: e.target.value } : row
                        )
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full" onClick={() => void submitPassengers()} disabled={api.loading}>
            {api.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Block seats & continue to payment
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold">Complete payment</h1>
      {session?.blockExpiresAt && <BlockTimer expiresAt={session.blockExpiresAt} />}
      <Card className="mt-4">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Seats are held for 8 minutes. Pay now to confirm your ticket.
          </p>
          <Button className="w-full" onClick={() => void payNow()} disabled={api.loading}>
            {api.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay with Razorpay
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
