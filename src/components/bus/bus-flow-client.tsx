"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
} from "lucide-react";
import { BusSearchScreen } from "@/components/bus/bus-search-screen";
import { BusResultsScreen } from "@/components/bus/bus-results-screen";
import { BusSeatScreen } from "@/components/bus/bus-seat-screen";
import { BusPassengerScreen } from "@/components/bus/bus-passenger-screen";
import { BusPaymentScreen } from "@/components/bus/bus-payment-screen";
import { BusDebugPanel, type BusFlowDebugState } from "@/components/bus/bus-debug-panel";
import { useBusBookingApi } from "@/hooks/use-bus-booking";
import { useAuth } from "@/contexts/auth-context";
import type { BusSearchDebug } from "@/lib/bus/debug";
import { logBusSearchDebug } from "@/lib/bus/debug";
import { resolveBusBpDp } from "@/lib/bus/bpdp-resolver";
import { getSeatApiFare } from "@/lib/bus/fare-utils";
import { normalizeSeatSellerSeats } from "@/lib/bus/normalize-seats";
import {
  loadBusSearchResults,
  saveBusSearchResults,
} from "@/lib/bus/search-session";
import {
  loadBusSession,
  saveBusSession,
  clearBusSession,
  type BusBookingSession,
  type BusSearchParams,
} from "@/lib/bus/session";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type { BusCityRecord } from "@/lib/seatseller/types";
import type { BusBookingRecord, BusPassengerDetail, SeatSellerSeat } from "@/lib/seatseller/types";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
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
  const [bpdpMessage, setBpdpMessage] = useState<string | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<BusBookingRecord | null>(null);
  const [paymentLoadError, setPaymentLoadError] = useState<string | null>(null);
  const [flowDebug, setFlowDebug] = useState<BusFlowDebugState>({});

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

    if (step === "passenger-details" && !loadBusSession()?.trip) {
      router.replace("/bus/search");
    }
    if (step === "seat-layout" && !loadBusSession()?.trip) {
      router.replace("/bus/results");
    }
  }, [step, router]);

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
    setBpdpMessage(null);
    void (async () => {
      try {
        const useBpDpLayout = isBpDpSeatLayoutEnabled(session?.trip?.bpDpSeatLayout);
        const [tripDetailsResponse, resolved] = await Promise.all([
          useBpDpLayout
            ? Promise.resolve(null)
            : api.fetchTripDetails({ tripId }),
          resolveBusBpDp({
            trip: session?.trip as Record<string, unknown> | undefined,
            tripId,
            fetchBpDp: async (id) => {
              const res = await fetch("/api/bus/bpdp-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tripId: id }),
              });
              const json = await res.json();
              if (!json.success) {
                throw new Error(json.error ?? "Failed to load boarding/dropping points");
              }
              return json.data as {
                boardingPoints: Array<{ id: string; location: string; time: string }>;
                droppingPoints: Array<{ id: string; location: string; time: string }>;
                message?: string | null;
              };
            },
          }),
        ]);

        let tripDetailsResult = tripDetailsResponse?.details ?? null;
        if (!useBpDpLayout) {
          if (!tripDetailsResult) {
            setSeatLayoutError(api.error ?? "Could not load seat layout. Please try another bus.");
            return;
          }
          const seats = normalizeSeatSellerSeats(tripDetailsResult.seats);
          if (!seats.length) {
            setSeatLayoutError("Seat layout is empty for this bus. Please choose another service.");
            return;
          }
          setTripDetails({
            seats,
            maxSeatsPerTicket: tripDetailsResult.maxSeatsPerTicket || 6,
            forcedSeats: tripDetailsResult.forcedSeats,
          });
        }

        setBpdp({
          boardingPoints: resolved.boardingPoints,
          droppingPoints: resolved.droppingPoints,
        });
        setBpdpMessage(resolved.message);
        const firstBoarding = resolved.boardingPoints.find((p) => p.id);
        const firstDropping = resolved.droppingPoints.find((p) => p.id);
        if (firstBoarding) setBoardingId(firstBoarding.id);
        if (firstDropping) setDroppingId(firstDropping.id);

        setFlowDebug({
          tripId,
          sourceCityId: session?.search.sourceCityId,
          destinationCityId: session?.search.destinationCityId,
          boardingCount: resolved.boardingPoints.length,
          droppingCount: resolved.droppingPoints.length,
          embeddedBoardingCount: resolved.embeddedBoardingCount,
          embeddedDroppingCount: resolved.embeddedDroppingCount,
          apiBoardingCount: resolved.apiBoardingCount,
          apiDroppingCount: resolved.apiDroppingCount,
          seatCount: tripDetailsResult?.seats?.length ?? 0,
          callFareBreakupApi: session?.trip?.callFareBreakupApi,
          bpDpSeatLayout: isBpDpSeatLayoutEnabled(session?.trip?.bpDpSeatLayout),
          bpdpSource: resolved.source,
          apiMessage: resolved.message,
          payloadShape: tripDetailsResponse?.debug?.payloadShape,
          rawTrip: session?.trip,
        });
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

    setSeatLayoutLoading(true);
    void api
      .fetchTripDetails({
        tripId,
        bpId: boardingId,
        dpId: droppingId,
        bpDpSeatLayout: true,
      })
      .then((response) => {
        if (!response?.details) return;
        const seats = normalizeSeatSellerSeats(response.details.seats);
        setTripDetails({
          seats,
          maxSeatsPerTicket: response.details.maxSeatsPerTicket,
          forcedSeats: response.details.forcedSeats,
        });
        setFlowDebug((prev) => ({
          ...prev,
          seatCount: seats.length,
          totalFare: seats.reduce((s, seat) => s + getSeatApiFare(seat), 0),
          payloadShape: response.debug?.payloadShape ?? prev.payloadShape,
        }));
      })
      .finally(() => setSeatLayoutLoading(false));
  }, [step, session?.trip?.id, session?.trip?.bpDpSeatLayout, boardingId, droppingId]);

  useEffect(() => {
    if (!ready || step !== "payment") return;
    const params = new URLSearchParams(window.location.search);
    const bookingId = session?.bookingId ?? params.get("bookingId");
    if (!bookingId) {
      setPaymentLoadError("No booking found. Please complete passenger details first.");
      return;
    }
    setPaymentLoadError(null);
    void api.fetchBooking(bookingId).then((booking) => {
      if (!booking) {
        setPaymentLoadError(api.error ?? "Booking not found");
        return;
      }
      setPaymentBooking(booking);
      if (booking.passengerDetails?.length) setPassengers(booking.passengerDetails);
    });
  }, [ready, step, session?.bookingId]);

  const toggleSeat = (seat: SeatSellerSeat) => {
    if (!tripDetails) return;
    const exists = selectedSeats.find((s) => s.name === seat.name);
    if (!exists) {
      if (seat.ladiesSeat) toast.message(`Seat ${seat.name} is for female passengers`);
      if (seat.malesSeat) toast.message(`Seat ${seat.name} is for male passengers`);
    }
    setSelectedSeats((prev) => {
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
    const contactEmail = user?.email ?? "";
    const contactPhone = user?.phone ?? "";
    const contactName = user?.name ?? "";
    const next: BusBookingSession = {
      ...session,
      selectedSeats,
      boardingPoint: boarding,
      droppingPoint: dropping,
      passengers: selectedSeats.map((seat, index) => ({
        title: "Mr",
        firstName: index === 0 ? contactName.split(" ")[0] ?? "" : "",
        lastName: index === 0 ? contactName.split(" ").slice(1).join(" ") ?? "" : "",
        name: index === 0 ? contactName : "",
        age: 30,
        gender: seat.ladiesSeat ? "FEMALE" : "MALE",
        mobile: index === 0 ? contactPhone : "",
        email: index === 0 ? contactEmail : "",
        idType: "AADHAR",
        idNumber: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        emergencyContact: "",
        seatName: seat.name,
        ladiesSeat: Boolean(seat.ladiesSeat),
        fare: getSeatApiFare(seat),
      })),
    };
    saveBusSession(next);
    setSession(next);
    setPassengers(next.passengers ?? []);
    router.push("/bus/passenger-details");
  };

  const submitPassengers = async () => {
    if (!session?.trip || !session.boardingPoint || !session.droppingPoint) {
      toast.error("Missing trip or boarding/dropping details. Please reselect seats.");
      return;
    }
    const normalized = passengers.map((p) => ({
      ...p,
      name:
        p.name.trim() ||
        `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
    }));
    setPassengers(normalized);

    for (let i = 0; i < normalized.length; i += 1) {
      const p = normalized[i];
      const passengerNo = i + 1;
      if (!p.name || p.name.trim().length < 2) {
        toast.error(`Passenger ${passengerNo}: enter valid full name`);
        return;
      }
      if (!/^\d{10}$/.test(p.mobile ?? "")) {
        toast.error(`Passenger ${passengerNo}: mobile must be exactly 10 digits`);
        return;
      }
      if (p.emergencyContact && !/^\d{10}$/.test(p.emergencyContact)) {
        toast.error(`Passenger ${passengerNo}: emergency contact must be 10 digits`);
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email ?? "");
      if (!emailOk) {
        toast.error(`Passenger ${passengerNo}: enter valid email`);
        return;
      }
      if (!p.idNumber || p.idNumber.trim().length < 4) {
        toast.error(`Passenger ${passengerNo}: enter valid ID number`);
        return;
      }
      if (!p.address || p.address.trim().length < 3) {
        toast.error(`Passenger ${passengerNo}: enter valid address`);
        return;
      }
      if (p.pincode && !/^\d{6}$/.test(p.pincode)) {
        toast.error(`Passenger ${passengerNo}: pincode must be 6 digits`);
        return;
      }
      if (!Number.isInteger(p.age) || p.age < 1 || p.age > 120) {
        toast.error(`Passenger ${passengerNo}: age must be between 1 and 120`);
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
      passengers: normalized,
      callFareBreakupApi: session.trip.callFareBreakupApi,
      cancellationPolicy: session.trip.cancellationPolicy,
      bpDpSeatLayout: isBpDpSeatLayoutEnabled(session.trip.bpDpSeatLayout),
      operatorId: session.trip.operator,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const next: BusBookingSession = {
      ...session,
      passengers: normalized,
      bookingId: result.data.booking.bookingId,
      blockExpiresAt: result.data.blockExpiresAt,
    };
    saveBusSession(next);
    setSession(next);
    router.push(`/bus/payment?bookingId=${result.data.booking.bookingId}`);
  };

  const payNow = async () => {
    const bookingId =
      paymentBooking?.bookingId ??
      session?.bookingId ??
      new URLSearchParams(window.location.search).get("bookingId");
    const primary = passengers[0] ?? paymentBooking?.passengerDetails?.[0];
    if (!bookingId || !primary) {
      toast.error("Booking details missing");
      return;
    }

    const booking =
      paymentBooking ?? (await api.fetchBooking(bookingId));
    if (!booking) {
      toast.error(api.error ?? "Booking not found");
      return;
    }

    const payResult = await api.payForBooking(booking, {
      name: primary.name,
      email: primary.email,
      phone: primary.mobile,
    });

    if (!payResult) return;
    if (payResult.manualReview) {
      toast.warning(payResult.message);
    } else {
      toast.success("Bus ticket confirmed!");
    }
    clearBusSession();
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
      <>
        <BusSeatScreen
          trip={session?.trip}
          seats={tripDetails?.seats ?? []}
          selectedSeats={selectedSeats}
          maxSeats={tripDetails?.maxSeatsPerTicket ?? 6}
          loading={seatLayoutLoading || (api.loading && !tripDetails)}
          loadError={seatLayoutError}
          bpdpWarning={bpdpMessage}
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
        {isStaff && <div className="container mx-auto px-4 pb-8"><BusDebugPanel debug={flowDebug} /></div>}
      </>
    );
  }

  if (step === "passenger-details" && session?.trip) {
    return (
      <BusPassengerScreen
        search={session.search}
        trip={session.trip}
        passengers={passengers}
        loading={api.loading}
        locale={locale}
        onChange={setPassengers}
        onSubmit={() => void submitPassengers()}
      />
    );
  }

  if (step === "payment") {
    return (
      <BusPaymentScreen
        booking={paymentBooking}
        loading={api.loading}
        loadError={paymentLoadError}
        locale={locale}
        onPay={() => void payNow()}
      />
    );
  }

  return null;
}
