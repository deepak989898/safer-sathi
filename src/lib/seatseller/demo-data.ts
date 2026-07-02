import type {
  SeatSellerBoardingPoint,
  SeatSellerBpDpDetails,
  SeatSellerCity,
  SeatSellerSeat,
  SeatSellerTrip,
  SeatSellerTripDetails,
} from "@/lib/seatseller/types";

export function getDemoCities(): SeatSellerCity[] {
  return [
    { id: "3", name: "Delhi" },
    { id: "6", name: "Mumbai" },
    { id: "7", name: "Bangalore" },
    { id: "12", name: "Jaipur" },
    { id: "18", name: "Lucknow" },
    { id: "21", name: "Varanasi" },
    { id: "25", name: "Goa" },
    { id: "30", name: "Manali" },
  ];
}

export function getDemoTrips(
  source: string,
  destination: string,
  doj: string
): SeatSellerTrip[] {
  const sourceCity = getDemoCities().find((c) => c.id === source);
  const destCity = getDemoCities().find((c) => c.id === destination);
  if (!sourceCity || !destCity) return [];

  return [
    {
      id: `demo_trip_${source}_${destination}_1`,
      travels: "Safar Express",
      operator: "Safar Express",
      busType: "AC Seater (2+2)",
      departureTime: "22:30",
      arrivalTime: "06:15",
      availableSeats: 18,
      AC: true,
      seater: true,
      sleeper: false,
      mTicketEnabled: true,
      maxSeatsPerTicket: 6,
      callFareBreakupApi: false,
      cancellationPolicy: "50% refund before 6 hours of departure.",
      duration: "7h 45m",
      fareDetails: [{ baseFare: 650, totalFare: 720, serviceTax: 70 }],
    },
    {
      id: `demo_trip_${source}_${destination}_2`,
      travels: "Himalayan Travels",
      operator: "Himalayan Travels",
      busType: "AC Sleeper",
      departureTime: "21:00",
      arrivalTime: "05:30",
      availableSeats: 12,
      AC: true,
      seater: false,
      sleeper: true,
      mTicketEnabled: true,
      maxSeatsPerTicket: 4,
      callFareBreakupApi: false,
      cancellationPolicy: "No refund within 2 hours of departure.",
      duration: "8h 30m",
      fareDetails: [{ baseFare: 890, totalFare: 980, serviceTax: 90 }],
    },
    {
      id: `demo_trip_${source}_${destination}_3`,
      travels: "City Connect",
      operator: "City Connect",
      busType: "Non-AC Seater",
      departureTime: "06:00",
      arrivalTime: "14:30",
      availableSeats: 24,
      AC: false,
      seater: true,
      sleeper: false,
      mTicketEnabled: false,
      maxSeatsPerTicket: 6,
      callFareBreakupApi: false,
      cancellationPolicy: "Full refund before 12 hours.",
      duration: "8h 30m",
      fareDetails: [{ baseFare: 450, totalFare: 495, serviceTax: 45 }],
    },
  ].map((t) => ({ ...t, doj }));
}

function buildDemoSeats(tripId: string): SeatSellerSeat[] {
  const isSleeper = tripId.includes("_2");
  const seats: SeatSellerSeat[] = [];
  const rows = isSleeper ? 5 : 10;
  const cols = isSleeper ? 3 : 4;
  let fare = tripId.includes("_3") ? 495 : tripId.includes("_2") ? 980 : 720;

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const name = isSleeper ? `L${row}` : `${row}${String.fromCharCode(64 + col)}`;
      if (col === 2 && !isSleeper) continue;
      const booked = (row + col) % 4 === 0;
      seats.push({
        name,
        row,
        column: col,
        zIndex: isSleeper && col > 1 ? 1 : 0,
        length: isSleeper ? 2 : 1,
        width: isSleeper ? 1 : 1,
        available: !booked,
        ladiesSeat: row === 1 && col === 1,
        malesSeat: row === rows && col === cols,
        fare,
        baseFare: fare * 0.9,
        serviceTaxAbsolute: fare * 0.1,
      });
    }
  }
  return seats;
}

export function getDemoTripDetails(tripId: string): SeatSellerTripDetails {
  return {
    availableTripId: tripId,
    maxSeatsPerTicket: tripId.includes("_2") ? 4 : 6,
    callFareBreakupApi: false,
    seats: buildDemoSeats(tripId),
    forcedSeats: [],
  };
}

export function getDemoBpDp(tripId: string): SeatSellerBpDpDetails {
  const boardingPoints: SeatSellerBoardingPoint[] = [
    {
      id: "bp1",
      location: "Main Bus Stand",
      time: "22:00",
      landmark: "Near City Mall",
      address: "Platform 3",
    },
    {
      id: "bp2",
      location: "Railway Station Pickup",
      time: "22:15",
      landmark: "East Gate",
    },
  ];
  const droppingPoints = [
    { id: "dp1", location: "Central Bus Terminal", time: "06:00" },
    { id: "dp2", location: "City Center Drop", time: "06:30" },
  ];
  return { boardingPoints, droppingPoints };
}

export function getTripStartingFare(trip: SeatSellerTrip): number {
  if (trip.fareDetails?.length) {
    return trip.fareDetails[0].totalFare;
  }
  if (Array.isArray(trip.fares) && trip.fares.length) {
    return Number(trip.fares[0]);
  }
  if (trip.fares && typeof trip.fares === "object") {
    const values = Object.values(trip.fares);
    if (values.length) return Number(values[0]);
  }
  return 0;
}
