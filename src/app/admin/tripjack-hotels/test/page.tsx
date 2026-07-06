"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApiFetch } from "@/lib/admin/api-client";
import { TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE } from "@/lib/tripjack-hotels/messages";
import { toast } from "sonner";

export default function TripJackHotelsTestPage() {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  const run = async (test: string, payload?: Record<string, unknown>) => {
    setLoading(test);
    setResult(null);
    try {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test, payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      if (json.data?.warning) {
        toast.warning(String(json.data.warning));
      } else {
        toast.success(`${test} OK`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setLoading(null);
    }
  };

  const runProxy = async (name: string) => {
    setLoading(`proxy-${name}`);
    setResult(null);
    try {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/proxy-test", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Proxy test failed");
      const row = (json.data.results as Array<Record<string, unknown>> | undefined)?.find(
        (item) => item.name === name || (name === "health" && (item.name === "health" || item.name === "root"))
      );
      setResult(row ?? json.data);
      if (row?.warning) {
        toast.warning(String(row.warning));
      } else if (row?.ok) {
        toast.success(`${name} proxy OK`);
      } else {
        toast.error(`${name} proxy failed`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Proxy test failed");
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    { id: "proxy-health", label: "Health (proxy)", action: () => runProxy("health") },
    { id: "nationalities", label: "Nationalities", action: () => void run("nationalities") },
    { id: "listing", label: "Listing", action: () => void run("listing") },
    { id: "pricing", label: "Pricing", action: () => void run("pricing") },
    { id: "review", label: "Review", action: () => void run("review") },
    {
      id: "static-hotels",
      label: "Static catalog",
      action: () => void run("static-hotels"),
    },
  ] as const;

  return (
    <>
      <AdminHeader title="TripJack Hotels — Test Panel" />
      <div className="space-y-4 p-6">
        <Link href="/admin/tripjack-hotels" className="text-sm text-primary hover:underline">
          ← Operations dashboard
        </Link>

        <p className="text-sm text-muted-foreground">
          Tests call server → VPS proxy → TripJack HMS. Static catalog 403 means TripJack account
          permissions — dynamic listing may still work.
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
