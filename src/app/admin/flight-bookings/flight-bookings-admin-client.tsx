"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Loader2,
  Plane,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { FlightAdminStats } from "@/lib/flights/admin-service";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

function statusBadgeClass(status: string) {
  if (status === "confirmed" || status === "refund_completed")
    return "bg-emerald-100 text-emerald-800";
  if (
    status === "manual_review_required" ||
    status === "booking_pending" ||
    status === "cancellation_requested" ||
    status === "refund_pending" ||
    status === "payment_pending"
  ) {
    return "bg-amber-100 text-amber-800";
  }
  if (
    status === "cancelled" ||
    status === "payment_failed" ||
    status === "booking_failed" ||
    status === "released"
  ) {
    return "bg-red-100 text-red-800";
  }
  return "bg-blue-100 text-blue-800";
}

function paymentBadgeClass(status: string) {
  if (status === "paid" || status === "refunded") return "bg-emerald-100 text-emerald-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function FlightBookingsAdminClient() {
  const [bookings, setBookings] = useState<FlightBookingRecord[]>([]);
  const [stats, setStats] = useState<FlightAdminStats | null>(null);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [routes, setRoutes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [airline, setAirline] = useState("all");
  const [route, setRoute] = useState("all");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (airline !== "all") params.set("airline", airline);
    if (route !== "all") params.set("route", route);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [q, status, paymentStatus, dateFrom, dateTo, airline, route, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/api/admin/flight-bookings?${queryString}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBookings(json.data.bookings ?? []);
      setStats(json.data.stats ?? null);
      setTotal(json.data.total ?? 0);
      setAirlines(json.data.airlines ?? []);
      setRoutes(json.data.routes ?? []);
      setCanManage(Boolean(json.data.permissions?.canManage));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load flight bookings");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, paymentStatus, dateFrom, dateTo, airline, route]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = () => {
    const header = [
      "Booking ID",
      "Customer",
      "Email",
      "Phone",
      "Route",
      "Travel Date",
      "Airline",
      "PNR",
      "Total Fare",
      "Payment Status",
      "Booking Status",
      "Created At",
    ];
    const rows = bookings.map((b) => [
      b.bookingId,
      b.customerName,
      b.customerEmail,
      b.customerMobile,
      `${b.sourceCode}-${b.destinationCode}`,
      b.travelDate,
      `${b.airlineCode} ${b.flightNumber}`,
      b.pnr || b.airlinePnr || "",
      String(b.totalFare),
      b.paymentStatus,
      b.status,
      b.createdAt,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-bookings-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAction = async (bookingId: string, action: string) => {
    if (!canManage && (action === "refresh_detail" || action === "retry_poll")) {
      toast.error("Only Super Admin can retry TripJack actions");
      return;
    }
    try {
      const res = await adminApiFetch(`/api/admin/flight-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Updated");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <>
      <AdminHeader title="Flight Bookings" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Manage TripJack flight bookings, payments, cancellations, and refunds
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!bookings.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Confirmed" value={stats.confirmed} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Manual Review" value={stats.manualReview} />
            <StatCard label="Cancelled" value={stats.cancelled} />
            <StatCard label="Refund Pending" value={stats.refundPending} />
            <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue, "en")} />
            <StatCard label="Today Revenue" value={formatCurrency(stats.todayRevenue, "en")} />
          </div>
        )}

        <Card>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search booking ID, PNR, name, email, phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="manual_review_required">Manual review</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refund_pending">Refund pending</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentStatus}
              onValueChange={(v) => v && setPaymentStatus(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="payment_success">Payment success</SelectItem>
                <SelectItem value="payment_failed">Payment failed</SelectItem>
                <SelectItem value="payment_pending">Payment pending</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Select value={airline} onValueChange={(v) => v && setAirline(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Airline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All airlines</SelectItem>
                {airlines.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={route} onValueChange={(v) => v && setRoute(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading flight bookings…
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Plane className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold">No flight bookings found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting filters or wait for new bookings.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && bookings.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Booking ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Route</th>
                    <th className="px-3 py-3">Travel</th>
                    <th className="px-3 py-3">Airline</th>
                    <th className="px-3 py-3">PNR</th>
                    <th className="px-3 py-3">Fare</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Ticket</th>
                    <th className="px-3 py-3">Cancel / Refund</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.bookingId} className="border-b last:border-0 hover:bg-slate-50/80">
                      <td className="px-3 py-3 font-mono text-xs">{b.bookingId}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{b.customerName}</p>
                        <p className="text-xs text-muted-foreground">{b.customerEmail}</p>
                        <p className="text-xs text-muted-foreground">{b.customerMobile}</p>
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {b.sourceCode} → {b.destinationCode}
                      </td>
                      <td className="px-3 py-3">{b.travelDate}</td>
                      <td className="px-3 py-3">
                        {b.airlineCode} {b.flightNumber}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {b.pnr || b.airlinePnr || "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold">
                        {formatCurrency(b.totalFare, "en")}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`border-0 ${paymentBadgeClass(b.paymentStatus)}`}>
                          {b.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={`border-0 ${statusBadgeClass(b.status)}`}>
                          {b.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {b.ticketStatus || b.ticketNumber || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p>{b.refundStatus || "—"}</p>
                        {typeof b.refundAmount === "number" && b.refundAmount > 0 && (
                          <p className="text-emerald-700">
                            {formatCurrency(b.refundAmount, "en")}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/admin/flight-bookings/${b.bookingId}`}
                            className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-muted"
                          >
                            View
                          </Link>
                          <Link
                            href={`/flights/ticket/${b.bookingId}`}
                            target="_blank"
                            className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-muted"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Ticket
                          </Link>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => void runAction(b.bookingId, "refresh_detail")}
                            >
                              Refresh
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
