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
  apiCalled: boolean;
  apiBoardingCount: number;
  apiDroppingCount: number;
  embeddedBoardingCount: number;
  embeddedDroppingCount: number;
}

function dedupePoints<T extends { id: string }>(points: T[]): T[] {
  const seen = new Set<string>();
  return points.filter((point) => {
    if (!point.id || seen.has(point.id)) return false;
    seen.add(point.id);
    return true;
  });
}

/** Merge embedded search BP/DP with live bpdpDetails API (always calls API). */
export async function resolveBusBpDp(input: {
  trip: Record<string, unknown> | null | undefined;
  tripId: string;
  fetchBpDp: (tripId: string) => Promise<{
    boardingPoints: Array<{ id: string; location: string; time: string }>;
    droppingPoints: Array<{ id: string; location: string; time: string }>;
    message?: string | null;
  } | null>;
}): Promise<ResolvedBusBpDp> {
  const embedded = parseTripEmbeddedBpDp(input.trip);
  let apiBoarding: BusBoardingPoint[] = [];
  let apiDropping: BusDroppingPoint[] = [];
  let apiCalled = false;
  let apiMessage: string | null = null;

  try {
    apiCalled = true;
    const apiResult = await input.fetchBpDp(input.tripId);
    if (apiResult) {
      const parsed = parseSeatSellerBpDp(apiResult);
      apiBoarding = parsed.boardingPoints;
      apiDropping = parsed.droppingPoints;
      apiMessage = apiResult.message ?? null;
    }
  } catch {
    /* fetchBpDp caller surfaces transport errors */
  }

  const mergedBoarding = dedupePoints([...embedded.boardingPoints, ...apiBoarding]);
  const mergedDropping = dedupePoints([...embedded.droppingPoints, ...apiDropping]);

  let source: ResolvedBusBpDp["source"] = "api";
  if (embedded.boardingPoints.length && embedded.droppingPoints.length) {
    source = apiBoarding.length || apiDropping.length ? "merged" : "embedded";
  } else if (embedded.boardingPoints.length || embedded.droppingPoints.length) {
    source = "merged";
  }

  let message: string | null = null;
  if (!mergedBoarding.length && !mergedDropping.length) {
    message =
      apiMessage ??
      "No boarding or dropping points returned by SeatSeller for this bus. Please try another service.";
  } else if (!mergedBoarding.length) {
    message =
      apiMessage ?? "No boarding points returned by SeatSeller for this trip.";
  } else if (!mergedDropping.length) {
    message =
      apiMessage ??
      "No dropping points returned by SeatSeller for this service.";
  }

  return {
    boardingPoints: mergedBoarding,
    droppingPoints: mergedDropping,
    source,
    message,
    apiCalled,
    apiBoardingCount: apiBoarding.length,
    apiDroppingCount: apiDropping.length,
    embeddedBoardingCount: embedded.boardingPoints.length,
    embeddedDroppingCount: embedded.droppingPoints.length,
  };
}
