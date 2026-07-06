"use client";

import { Card, CardContent } from "@/components/ui/card";

export interface BusFlowDebugState {
  tripId?: string;
  sourceCityId?: string;
  destinationCityId?: string;
  boardingCount?: number;
  droppingCount?: number;
  embeddedBoardingCount?: number;
  embeddedDroppingCount?: number;
  apiBoardingCount?: number;
  apiDroppingCount?: number;
  seatCount?: number;
  totalFare?: number;
  callFareBreakupApi?: boolean;
  bpDpSeatLayout?: boolean;
  bpdpSource?: string;
  apiMessage?: string | null;
  payloadShape?: {
    topLevelKeys: string[];
    arrayKeys: string[];
    nestedPaths: string[];
  };
  rawTrip?: unknown;
}

interface BusDebugPanelProps {
  debug: BusFlowDebugState;
}

export function BusDebugPanel({ debug }: BusDebugPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="space-y-2 pt-4">
        <p className="text-sm font-semibold text-amber-900">Bus flow debug (admin only)</p>
        <div className="grid gap-1 text-xs text-amber-950 md:grid-cols-2">
          <p>Trip ID: {debug.tripId ?? "—"}</p>
          <p>Source ID: {debug.sourceCityId ?? "—"}</p>
          <p>Destination ID: {debug.destinationCityId ?? "—"}</p>
          <p>Boarding points: {debug.boardingCount ?? 0}</p>
          <p>Dropping points: {debug.droppingCount ?? 0}</p>
          <p>Embedded BP/DP: {debug.embeddedBoardingCount ?? 0}/{debug.embeddedDroppingCount ?? 0}</p>
          <p>API BP/DP: {debug.apiBoardingCount ?? 0}/{debug.apiDroppingCount ?? 0}</p>
          <p>Seats loaded: {debug.seatCount ?? 0}</p>
          <p>Fare total: {debug.totalFare ?? 0}</p>
          <p>callFareBreakupApi: {String(debug.callFareBreakupApi ?? false)}</p>
          <p>bpDpSeatLayout: {String(debug.bpDpSeatLayout ?? false)}</p>
          <p>BP/DP source: {debug.bpdpSource ?? "—"}</p>
        </div>
        {debug.payloadShape && (
          <div className="text-xs text-amber-950">
            <p className="font-medium">API payload shape (live)</p>
            <p>Keys: {debug.payloadShape.topLevelKeys.join(", ") || "—"}</p>
            <p>Arrays: {debug.payloadShape.arrayKeys.join(", ") || "—"}</p>
            {debug.payloadShape.nestedPaths.map((path) => (
              <p key={path} className="truncate">
                {path}
              </p>
            ))}
          </div>
        )}
        {debug.apiMessage && (
          <p className="text-xs text-amber-800">API: {debug.apiMessage}</p>
        )}
        {debug.rawTrip != null && (
          <pre className="max-h-48 overflow-auto rounded-md bg-white/80 p-2 text-[10px]">
            {JSON.stringify(debug.rawTrip, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
