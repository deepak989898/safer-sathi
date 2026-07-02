"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adminApiFetch } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import type { BusBookingRecord } from "@/lib/seatseller/types";
import { toast } from "sonner";

export default function BusBookingsAdminClient() {
  const [bookings, setBookings] = useState<BusBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingCities, setSyncingCities] = useState(false);
  const [testingRoutes, setTestingRoutes] = useState(false);
  const [routeTestOutput, setRouteTestOutput] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusBookingRecord | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/api/bus/bookings");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBookings(json.data.bookings ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncCities = async () => {
    setSyncingCities(true);
    toast.info("Syncing cities from SeatSeller — this can take 1–2 minutes on first run.");
    try {
      const res = await adminApiFetch("/api/bus/sync-cities?force=true", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const { synced, count, aliasCount, message } = json.data ?? {};
      if (synced) {
        toast.success(`Synced ${count ?? 0} cities${aliasCount ? ` and ${aliasCount} aliases` : ""}`);
      } else {
        toast.info(message ?? `Cities already synced (${count ?? 0} in database)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "City sync failed");
    } finally {
      setSyncingCities(false);
    }
  };

  const testSampleRoutes = async () => {
    setTestingRoutes(true);
    setRouteTestOutput(null);
    toast.info("Testing SeatSeller sample routes (today + 15 days)...");
    try {
      const res = await adminApiFetch("/api/bus/debug/test-routes", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const output = JSON.stringify(json.data.results, null, 2);
      setRouteTestOutput(output);
      console.log("[bus-test-routes]", json.data.results);
      toast.success("Route test completed — see results below / console");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Route test failed");
    } finally {
      setTestingRoutes(false);
    }
  };

  const runAction = async (bookingId: string, action: string, adminNotes?: string) => {
    try {
      const res = await adminApiFetch(`/api/bus/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Updated");
      void load();
      setSelected(json.data.booking);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <>
      <AdminHeader title="Bus Bookings" />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          SeatSeller bus bookings — pending, confirmed, manual review & cancelled
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => void syncCities()}
            disabled={syncingCities}
          >
            {syncingCities ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Sync bus cities
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void testSampleRoutes()}
            disabled={testingRoutes}
          >
            {testingRoutes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test sample routes
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {routeTestOutput && (
        <div className="px-4 pb-4">
          <Card>
            <CardContent className="pt-4">
              <p className="mb-2 text-sm font-semibold">Sample route test output</p>
              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                {routeTestOutput}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card
              key={b.bookingId}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => {
                setSelected(b);
                setNote(b.adminNotes ?? "");
              }}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div>
                  <p className="font-medium">
                    {b.sourceCityName} → {b.destinationCityName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.customerName} · {b.customerMobile} · {b.doj}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.operatorName} · Seats {b.seatNames.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{b.status}</Badge>
                  <p className="mt-1 font-semibold">{formatCurrency(b.totalFare, "en")}</p>
                  {b.tin && <p className="text-xs text-muted-foreground">TIN {b.tin}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && bookings.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No bus bookings yet</p>
          )}
        </div>

        {selected && (
          <Card className="h-fit lg:sticky lg:top-20">
            <CardContent className="space-y-3 pt-4 text-sm">
              <h3 className="font-semibold">Booking details</h3>
              <p>ID: {selected.bookingId}</p>
              <p>Status: <StatusBadge status={selected.status} /></p>
              <p>Payment: {selected.paymentStatus}</p>
              {selected.razorpayPaymentId && <p>Razorpay: {selected.razorpayPaymentId}</p>}
              {selected.tin && <p>TIN: {selected.tin}</p>}
              {selected.pnr && <p>PNR: {selected.pnr}</p>}
              {selected.blockKey && <p className="break-all">Block key: {selected.blockKey}</p>}
              <div>
                <p className="mb-1 font-medium">Passengers</p>
                <ul className="space-y-1 text-muted-foreground">
                  {selected.passengerDetails.map((p) => (
                    <li key={p.seatName}>
                      {p.name} · {p.gender} · Seat {p.seatName} · ₹{p.fare}
                    </li>
                  ))}
                </ul>
              </div>
              <Textarea
                placeholder="Internal notes"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                {selected.status === "manual_review_required" && (
                  <>
                    <Button size="sm" onClick={() => void runAction(selected.bookingId, "retry_confirm")}>
                      Retry confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void runAction(selected.bookingId, "mark_resolved", note)}
                    >
                      Mark resolved
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runAction(selected.bookingId, "add_note", note)}
                >
                  Save note
                </Button>
                <Link
                  href={`/bus/ticket/${selected.bookingId}`}
                  target="_blank"
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                >
                  View ticket
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
