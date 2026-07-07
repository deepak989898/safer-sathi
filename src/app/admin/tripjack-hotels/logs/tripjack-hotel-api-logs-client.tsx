"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  TripJackApiErrorPanel,
  type TripJackApiErrorDetails,
} from "@/components/admin/tripjack-api-error-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tripjackAdminApiCall } from "@/lib/tripjack-hotels/admin-response";
import type { TripJackHotelApiLog } from "@/lib/tripjack-hotels/catalog-types";
import { toast } from "sonner";

export default function TripJackHotelApiLogsClient() {
  const [logs, setLogs] = useState<TripJackHotelApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpoint, setEndpoint] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [apiError, setApiError] = useState<TripJackApiErrorDetails | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (endpoint.trim()) params.set("endpoint", endpoint.trim());
      if (bookingId.trim()) params.set("bookingId", bookingId.trim());

      const result = await tripjackAdminApiCall<{ logs: TripJackHotelApiLog[] }>(
        `/api/admin/tripjack-hotels/api-logs?${params}`,
        undefined,
        "Load API logs"
      );

      if (!result.ok) {
        setApiError({
          context: "Load API logs",
          message: result.error ?? "Failed to load logs",
          status: result.status,
          contentType: result.contentType,
          rawPreview: result.rawPreview,
        });
        toast.error(result.error?.split("\n")[0] ?? "Failed to load logs");
        return;
      }

      setLogs(result.data?.logs ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load logs";
      setApiError({ context: "Load API logs", message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminHeader title="TripJack Hotels — API Logs" />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Super Admin only. Raw request/response bodies are sanitized — API keys are never stored.
        </p>

        <TripJackApiErrorPanel error={apiError} onDismiss={() => setApiError(null)} />

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filter endpoint (e.g. hotels/book)"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Booking ID"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        {loading && logs.length === 0 ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : null}

        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-medium">{log.endpoint}</span>
                <Badge variant={log.success ? "secondary" : "destructive"}>
                  {log.success ? "OK" : "Error"}
                </Badge>
                {log.httpStatus != null ? (
                  <span className="text-xs text-muted-foreground">HTTP {log.httpStatus}</span>
                ) : null}
                <span className="text-xs text-muted-foreground">{log.createdAt}</span>
                {log.durationMs != null ? (
                  <span className="text-xs text-muted-foreground">{log.durationMs}ms</span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 text-xs"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  {expanded === log.id ? "Hide" : "Details"}
                </Button>
              </div>
              {log.errorMessage ? (
                <p className="mt-1 text-xs text-red-600">{log.errorMessage}</p>
              ) : null}
              {log.correlationId ? (
                <p className="mt-1 text-xs text-muted-foreground">Correlation: {log.correlationId}</p>
              ) : null}
              {expanded === log.id ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs">
                    {JSON.stringify(log.requestBody, null, 2)}
                  </pre>
                  <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs">
                    {JSON.stringify(log.responseBody, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
          {!loading && logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API logs found.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
