import {
  parseSeatSellerBpDp,
  parseTripEmbeddedBpDp,
} from "@/lib/seatseller/parse-trip-details";

export interface BusBoardingPoint {
  id: string;
  location: string;
  time: string;
  address?: string;
  landmark?: string;
  contact?: string;
}

export interface BusDroppingPoint {
  id: string;
  location: string;
  time: string;
  address?: string;
  landmark?: string;
}

export interface ResolvedBusBpDp {
  boardingPoints: BusBoardingPoint[];
  droppingPoints: BusDroppingPoint[];
  source: "embedded" | "api" | "merged";
  message: string | null;
}

function dedupePoints<T extends { id: string }>(points: T[]): T[] {
  const seen = new Set<string>();
  return points.filter((point) => {
    if (!point.id || seen.has(point.id)) return false;
    seen.add(point.id);
    return true;
  });
}

/** Phase 2: embedded boardingTimes first, then bpdpDetails API. */
export async function resolveBusBpDp(input: {
  trip: Record<string, unknown> | null | undefined;
  tripId: string;
  fetchBpDp: (tripId: string) => Promise<{
    boardingPoints: Array<{ id: string; location: string; time: string }>;
    droppingPoints: Array<{ id: string; location: string; time: string }>;
  } | null>;
}): Promise<ResolvedBusBpDp> {
  const embedded = parseTripEmbeddedBpDp(input.trip);
  let apiBoarding: BusBoardingPoint[] = [];
  let apiDropping: BusDroppingPoint[] = [];

  if (!embedded.boardingPoints.length || !embedded.droppingPoints.length) {
    const apiResult = await input.fetchBpDp(input.tripId);
    if (apiResult) {
      const parsed = parseSeatSellerBpDp(apiResult);
      apiBoarding = parsed.boardingPoints;
      apiDropping = parsed.droppingPoints;
    }
  }

  const mergedBoarding = dedupePoints([...embedded.boardingPoints, ...apiBoarding]);
  const mergedDropping = dedupePoints([...embedded.droppingPoints, ...apiDropping]);

  let source: ResolvedBusBpDp["source"] = "api";
  if (embedded.boardingPoints.length && embedded.droppingPoints.length) {
    source = "embedded";
  } else if (embedded.boardingPoints.length || embedded.droppingPoints.length) {
    source = "merged";
  }

  let message: string | null = null;
  if (!mergedBoarding.length && !mergedDropping.length) {
    message =
      "Boarding and dropping points are not available from SeatSeller for this bus. Please try another operator or contact support.";
  } else if (!mergedBoarding.length) {
    message = "Boarding points are not available for this bus. Please try another service.";
  } else if (!mergedDropping.length) {
    message = "Dropping points are not available for this bus. Please try another service.";
  }

  return {
    boardingPoints: mergedBoarding,
    droppingPoints: mergedDropping,
    source,
    message,
  };
}
