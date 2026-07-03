"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { FlightSearchDebug } from "@/hooks/use-flight-search";

interface FlightDebugPanelProps {
  debug: FlightSearchDebug;
}

export function FlightDebugPanel({ debug }: FlightDebugPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="space-y-2 pt-4">
        <p className="text-sm font-semibold text-amber-900">Flight search debug (admin/dev)</p>
        {debug.proxyEndpoint && (
          <p className="text-xs text-amber-950">Proxy: {debug.proxyEndpoint}</p>
        )}
        {debug.payloadShape && (
          <div className="text-xs text-amber-950">
            <p>Top keys: {debug.payloadShape.topLevelKeys.join(", ") || "—"}</p>
            <p>Trip info keys: {debug.payloadShape.tripInfoKeys.join(", ") || "—"}</p>
          </div>
        )}
        {debug.requestBody != null && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-amber-900">Request body</summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-white/80 p-2 text-[10px]">
              {JSON.stringify(debug.requestBody, null, 2)}
            </pre>
          </details>
        )}
        {debug.rawResponse != null && (
          <details className="text-xs" open>
            <summary className="cursor-pointer font-medium text-amber-900">Raw API response</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-white/80 p-2 text-[10px]">
              {JSON.stringify(debug.rawResponse, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
