"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Loader2,
  Shield,
} from "lucide-react";
import { BusSearchScreen } from "@/components/bus/bus-search-screen";
import { BusResultsScreen } from "@/components/bus/bus-results-screen";
import { BusSeatScreen } from "@/components/bus/bus-seat-screen";
import { useBusBookingApi } from "@/hooks/use-bus-booking";
import { useAuth } from "@/contexts/auth-context";
import type { BusSearchDebug } from "@/lib/bus/debug";
import { logBusSearchDebug } from "@/lib/bus/debug";
import { normalizeSeatSellerSeats } from "@/lib/bus/normalize-seats";
import { parseTripEmbeddedBpDp } from "@/lib/seatseller/parse-trip-details";
import {
  loadBusSearchResults,
  saveBusSearchResults,
} from "@/lib/bus/search-session";
import {
  loadBusSession,
  saveBusSession,
  type BusBookingSession,
  type BusSearchParams,
} from "@/lib/bus/session";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { formatCurrency } from "@/lib/i18n";
import type { BusCityRecord } from "@/lib/seatseller/types";
import type { BusPassengerDetail, SeatSellerSeat } from "@/lib/seatseller/types";
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

function emptySearch(): BusSearchParams {
  return {
    sourceCityId: "",
    sourceCityName: "",
    destinationCityId: "",
    destinationCityName: "",
    doj: tomorrowIso(),
  };
}

export function BusFlowClient({ step }: { step: BusFlowStep }) {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useBusBookingApi();
  const isStaff = user ? canShowAdminNav(user.role) : false;

  const [ready, setReady] = useState(false);
  const [fromCityOptions, setFromCityOptions] = useState<BusCityRecord[]>([]);
  const [toCityOptions, setToCityOptions] = useState<BusCityRecord[]>([]);
  const [session, setSession] = useState<BusBookingSession | null>(null);
  const [search, setSearch] = useState<BusSearchParams>(emptySearch);
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);
  const [trips, setTrips] = useState<BusBookingSession["trip"][]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchDebug, setSearchDebug] = useState<BusSearchDebug | null>(null);
  const [resultsLoading, setResultsLoading] = useState(step === "results");
  const [resultsLoaded, setResultsLoaded] = useState(false);
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
  const [seatLayoutError, setSeatLayoutError] = useState<string | null>(null);
  const [seatLayoutLoading, setSeatLayoutLoading] = useState(step === "seat-layout");
  const [pointsLoading, setPointsLoading] = useState(step === "seat-layout");

  const isBpDpSeatLayoutEnabled = (value: unknown): boolean =>
    value === true || String(value).toLowerCase() === "true";

  useEffect(() => {
    const saved = loadBusSession();
    const cached = loadBusSearchResults();

    if (saved) {
      setSession(saved);
      setSearch(saved.search);
      if (saved.selectedSeats?.length) setSelectedSeats(saved.selectedSeats);
      if (saved.passengers?.length) setPassengers(saved.passengers);
      if (saved.boardingPoint) setBoardingId(saved.boardingPoint.id);
      if (saved.droppingPoint) setDroppingId(saved.droppingPoint.id);
    }

    if (step === "results" && cached) {
      setSearch(cached.search);
      setTrips(cached.trips);
      setSearchMessage(cached.message);
      setSearchDebug(cached.debug ?? null);
      setResultsLoading(false);
      setResultsLoaded(true);
      if (cached.debug) logBusSearchDebug(cached.debug);
    } else if (step === "results") {
      setResultsLoading(false);
    }

    setReady(true);
  }, [step]);

  useEffect(() => {
    if (!showFromDropdown) return;
    const query = fromQuery || search.sourceCityName;
    const timer = window.setTimeout(() => {
      void api.fetchCities(query).then((data) => data && setFromCityOptions(data));
    }, query.length >= 2 ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [fromQuery, search.sourceCityName, showFromDropdown]);

  useEffect(() => {
    if (!showToDropdown) return;
    const query = toQuery || search.destinationCityName;
    const timer = window.setTimeout(() => {
      void api.fetchCities(query).then((data) => data && setToCityOptions(data));
    }, query.length >= 2 ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [toQuery, search.destinationCityName, showToDropdown]);

  useEffect(() => {
    if (step !== "results" || resultsLoaded || !search.sourceCityId) return;
    setResultsLoading(true);
    void api
      .searchTrips({
        source: search.sourceCityId,
        destination: search.destinationCityId,
        doj: search.doj,
        sourceName: search.sourceCityName,
        destinationName: search.destinationCityName,
      })
      .then((data) => {
        if (!data) return;
        setTrips(data.trips);
        setSearchMessage(data.message);
        setSearchDebug(data.debug ?? null);
        if (data.debug) logBusSearchDebug(data.debug);
      })
      .finally(() => setResultsLoading(false));
  }, [
    step,
    resultsLoaded,
    search.sourceCityId,
    search.destinationCityId,
    search.doj,
    search.sourceCityName,
    search.destinationCityName,
  ]);

  const fromCities = fromCityOptions;
  const toCities = toCityOptions;

  const handleSearch = async () => {
    if (!search.sourceCityId || !search.destinationCityId || !search.doj) {
      if (!search.sourceCityId) {
        setFromError("Please select a valid bus city from suggestions.");
      }
      if (!search.destinationCityId) {
        setToError("Please select a valid bus city from suggestions.");
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

    const debugLog = {
      sourceCityName: search.sourceCityName,
      sourceCityId: search.sourceCityId,
      destinationCityName: search.destinationCityName,
      destinationCityId: search.destinationCityId,
      journeyDate: search.doj.slice(0, 10),
    };
    console.log("[bus-search] submit", debugLog);
    logBusSearchDebug({
      ...debugLog,
      destinationCityId: debugLog.destinationCityId,
      sourceCityId: debugLog.sourceCityId,
      journeyDateInput: debugLog.journeyDate,
      journeyDateSentToApi: debugLog.journeyDate,
      requestBody,
      apiUrl: "/api/bus/available-trips",
      apiMethod: "POST",
      rawSeatSellerResponse: null,
      parsedTripsCount: 0,
      parsedTripsPreview: [],
      errorMessage: null,
      timestamp: new Date().toISOString(),
    });

    const result = await api.searchTrips(requestBody);
    if (!result) {
      toast.error(api.error ?? "Trip search failed. Please try again.");
      return;
    }

    if (result.debug) {
      logBusSearchDebug(result.debug);
      if (isStaff) setSearchDebug(result.debug);
    }

    setTrips(result.trips);
    setSearchMessage(result.message);
    setResultsLoaded(true);
    saveBusSearchResults({
      search: { ...search, doj: requestBody.doj },
      trips: result.trips,
      count: result.count,
      message: result.message,
      debug: result.debug ?? null,
      fetchedAt: new Date().toISOString(),
    });

    if (result.count > 0) {
      toast.success(result.message);
    } else {
      toast.message(result.message);
    }
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

  const selectTrip = (trip: BusBookingSession["trip"]) => {
    const activeSearch = search.sourceCityId
      ? search
      : loadBusSearchResults()?.search ?? loadBusSession()?.search ?? search;
    const tripId = String(trip.id ?? (trip as { availableTripId?: string }).availableTripId ?? "");
    const next: BusBookingSession = {
      search: activeSearch,
      trip: { ...trip, id: tripId },
      selectedSeats: [],
    };
    saveBusSession(next);
    setSession(next);
    setSearch(activeSearch);
    setSeatLayoutError(null);
    setTripDetails(null);
    setSelectedSeats([]);
    setBoardingId("");
    setDroppingId("");
    setSeatLayoutLoading(true);
    router.push("/bus/seat-layout");
  };

  const getTripId = (trip: BusBookingSession["trip"] | null | undefined): string =>
    String(trip?.id ?? (trip as { availableTripId?: string } | undefined)?.availableTripId ?? "");

  useEffect(() => {
    if (!ready || step !== "seat-layout") return;

    const tripId = getTripId(session?.trip);
    if (!tripId) {
      setSeatLayoutLoading(false);
      setSeatLayoutError(null);
      return;
    }

    setSeatLayoutLoading(true);
    setPointsLoading(true);
    setSeatLayoutError(null);
    void (async () => {
      try {
        const embedded = parseTripEmbeddedBpDp(
          session?.trip as Record<string, unknown> | undefined
        );
        const [details, points] = await Promise.all([
          api.fetchTripDetails({ tripId }),
          api.fetchBpDp(tripId),
        ]);
        if (!details) {
          setSeatLayoutError(api.error ?? "Could not load seat layout. Please try another bus.");
          return;
        }
        const seats = normalizeSeatSellerSeats(details.seats);
        if (!seats.length) {
          setSeatLayoutError("Seat layout is empty for this bus. Please choose another service.");
          return;
        }
        setTripDetails({
          seats,
          maxSeatsPerTicket: details.maxSeatsPerTicket || 6,
          forcedSeats: details.forcedSeats,
        });

        const merged = {
          boardingPoints:
            points?.boardingPoints?.length
              ? points.boardingPoints
              : embedded.boardingPoints,
          droppingPoints:
            points?.droppingPoints?.length
              ? points.droppingPoints
              : embedded.droppingPoints,
        };
        setBpdp(merged);
        const firstBoarding = merged.boardingPoints.find((p) => p.id);
        const firstDropping = merged.droppingPoints.find((p) => p.id);
        if (firstBoarding) setBoardingId(firstBoarding.id);
        if (firstDropping) setDroppingId(firstDropping.id);
      } catch (e) {
        setSeatLayoutError(e instanceof Error ? e.message : "Failed to load seat layout");
      } finally {
        setSeatLayoutLoading(false);
        setPointsLoading(false);
      }
    })();
  }, [ready, step, session?.trip?.id]);

  useEffect(() => {
    const tripId = getTripId(session?.trip);
    if (
      step !== "seat-layout" ||
      !session?.trip ||
      !tripId ||
      !boardingId ||
      !droppingId ||
      !isBpDpSeatLayoutEnabled(session.trip.bpDpSeatLayout)
    ) {
      return;
    }

    void api
      .fetchTripDetails({
        tripId,
        bpId: boardingId,
        dpId: droppingId,
        bpDpSeatLayout: true,
      })
      .then((details) => {
        if (!details) return;
        setTripDetails({
          seats: normalizeSeatSellerSeats(details.seats),
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

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
      </div>
    );
  }

  if (step === "search") {
    return (
      <BusSearchScreen
        search={search}
        fromQuery={fromQuery}
        toQuery={toQuery}
        fromCities={fromCities}
        toCities={toCities}
        showFromDropdown={showFromDropdown}
        showToDropdown={showToDropdown}
        fromError={fromError}
        toError={toError}
        loading={api.loading}
        onFromQueryChange={(value) => {
          setFromQuery(value);
          setSearch((s) => ({ ...s, sourceCityId: "", sourceCityName: value }));
          setFromError(null);
        }}
        onToQueryChange={(value) => {
          setToQuery(value);
          setSearch((s) => ({ ...s, destinationCityId: "", destinationCityName: value }));
          setToError(null);
        }}
        onFromFocus={() => {
          setShowFromDropdown(true);
          setShowToDropdown(false);
        }}
        onToFocus={() => {
          setShowToDropdown(true);
          setShowFromDropdown(false);
        }}
        onFromBlur={() => {
          setTimeout(() => {
            if (!search.sourceCityId && (fromQuery || search.sourceCityName)) {
              setFromError("Please select a valid bus city from suggestions.");
            }
          }, 120);
        }}
        onToBlur={() => {
          setTimeout(() => {
            if (!search.destinationCityId && (toQuery || search.destinationCityName)) {
              setToError("Please select a valid bus city from suggestions.");
            }
          }, 120);
        }}
        onSelectFrom={(city) => {
          setSearch((s) => ({ ...s, sourceCityId: city.id, sourceCityName: city.name }));
          setFromQuery("");
          setFromError(null);
          setShowFromDropdown(false);
        }}
        onSelectTo={(city) => {
          setSearch((s) => ({
            ...s,
            destinationCityId: city.id,
            destinationCityName: city.name,
          }));
          setToQuery("");
          setToError(null);
          setShowToDropdown(false);
        }}
        onSwap={swapSourceDestination}
        onDateChange={(value) => setSearch((s) => ({ ...s, doj: value }))}
        onSearch={() => void handleSearch()}
      />
    );
  }

  if (step === "results") {
    return (
      <>
        <BusResultsScreen
          search={search}
          trips={trips}
          loading={resultsLoading}
          error={api.error}
          message={searchMessage}
          locale={locale}
          onSelectTrip={selectTrip}
        />
        {isStaff && searchDebug && (
          <div className="container mx-auto px-4 pb-8">
            <Card>
              <CardContent className="space-y-2 pt-4">
                <p className="text-sm font-semibold">Bus search debug (admin)</p>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(searchDebug, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  if (step === "seat-layout") {
    return (
      <BusSeatScreen
        trip={session?.trip}
        seats={tripDetails?.seats ?? []}
        selectedSeats={selectedSeats}
        maxSeats={tripDetails?.maxSeatsPerTicket ?? 6}
        loading={seatLayoutLoading || (api.loading && !tripDetails)}
        loadError={seatLayoutError}
        boardingId={boardingId}
        droppingId={droppingId}
        boardingPoints={bpdp?.boardingPoints ?? []}
        droppingPoints={bpdp?.droppingPoints ?? []}
        pointsLoading={pointsLoading}
        locale={locale}
        onToggleSeat={toggleSeat}
        onBoardingChange={setBoardingId}
        onDroppingChange={setDroppingId}
        onContinue={continueToPassengers}
      />
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
