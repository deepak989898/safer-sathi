"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  TripJackApiErrorPanel,
  type TripJackApiErrorDetails,
} from "@/components/admin/tripjack-api-error-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tripjackAdminApiCall } from "@/lib/tripjack-hotels/admin-response";
import { TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE } from "@/lib/tripjack-hotels/messages";
import { toast } from "sonner";

export default function TripJackHotelsTestPage() {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [apiError, setApiError] = useState<TripJackApiErrorDetails | null>(null);

  const run = async (test: string, payload?: Record<string, unknown>) => {
    setLoading(test);
    setResult(null);
    setApiError(null);
    try {
      const apiResult = await tripjackAdminApiCall(
        "/api/admin/tripjack-hotels/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test, payload }),
        },
        `Test: ${test}`
      );

      if (!apiResult.ok) {
        setApiError({
          context: `Test: ${test}`,
          message: apiResult.error ?? "Test failed",
          status: apiResult.status,
          contentType: apiResult.contentType,
          rawPreview: apiResult.rawPreview,
        });
        toast.error(apiResult.error?.split("\n")[0] ?? "Test failed");
        return;
      }

      setResult(apiResult.data);
      const data = apiResult.data as { warning?: string } | undefined;
      if (data?.warning) {
        toast.warning(String(data.warning));
      } else {
        toast.success(`${test} OK`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test failed";
      setApiError({ context: `Test: ${test}`, message });
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const runProxy = async (name: string) => {
    setLoading(`proxy-${name}`);
    setResult(null);
    setApiError(null);
    try {
      const apiResult = await tripjackAdminApiCall<{
        results: Array<Record<string, unknown>>;
        message?: string;
      }>("/api/admin/tripjack-hotels/proxy-test", { method: "POST" }, `Proxy test: ${name}`);

      if (!apiResult.ok) {
        setApiError({
          context: `Proxy test: ${name}`,
          message: apiResult.error ?? "Proxy test failed",
          status: apiResult.status,
          contentType: apiResult.contentType,
          rawPreview: apiResult.rawPreview,
        });
        toast.error(apiResult.error?.split("\n")[0] ?? "Proxy test failed");
        return;
      }

      const row = apiResult.data?.results?.find(
        (item) => item.name === name || (name === "health" && (item.name === "health" || item.name === "root"))
      );
      setResult(row ?? apiResult.data);
      if (row?.warning) {
        toast.warning(String(row.warning));
      } else if (row?.ok) {
        toast.success(`${name} proxy OK`);
      } else {
        toast.error(`${name} proxy failed`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Proxy test failed";
      setApiError({ context: `Proxy test: ${name}`, message });
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    { id: "proxy-health", label: "Health (proxy)", action: () => runProxy("health") },
    { id: "nationalities", label: "Nationalities", action: () => void run("nationalities") },
    { id: "hotel-mapping", label: "Hotel mapping", action: () => void run("hotel-mapping") },
    {
      id: "hotel-content",
      label: "Hotel content",
      action: () => void run("hotel-content", { hotelIds: ["100001743803"] }),
    },
    { id: "listing", label: "Listing", action: () => void run("listing") },
    { id: "pricing", label: "Pricing", action: () => void run("pricing") },
    { id: "review", label: "Review", action: () => void run("review") },
  ] as const;

  return (
    <>
      <AdminHeader title="TripJack Hotels — Test Panel" />
      <div className="space-y-4 p-6">
        <Link href="/admin/tripjack-hotels" className="text-sm text-primary hover:underline">
          ← Operations dashboard
        </Link>

        <TripJackApiErrorPanel error={apiError} onDismiss={() => setApiError(null)} />

        <p className="text-sm text-muted-foreground">
          Tests call server → VPS proxy → TripJack HMS V3 static content APIs (mapping + content).
          A 403 means TripJack account permissions — dynamic listing may still work.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE}
        </div>

        <div className="flex flex-wrap gap-2">
          {tests.map((test) => (
            <Button
              key={test.id}
              size="sm"
              variant="outline"
              disabled={!!loading}
              onClick={test.action}
            >
              {loading === test.id || loading === `proxy-${test.id.replace("proxy-", "")}` ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {test.label}
            </Button>
          ))}
        </div>

        <div className="flex max-w-md gap-2">
          <Input
            placeholder="TripJack bookingId"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!!loading || !bookingId.trim()}
            onClick={() => void run("booking-details", { bookingId: bookingId.trim() })}
          >
            Booking details
          </Button>
        </div>

        {result != null && (
          <div className="space-y-2">
            <Button size="sm" variant="ghost" onClick={() => setDebugOpen((open) => !open)}>
              {debugOpen ? "Hide" : "Show"} raw debug response
            </Button>
            {debugOpen ? (
              <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
