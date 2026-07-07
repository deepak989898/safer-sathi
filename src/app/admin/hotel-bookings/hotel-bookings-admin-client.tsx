"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Download, Loader2, RefreshCw, Search } from "lucide-react";
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
import type { HotelAdminStats } from "@/lib/hotels/admin-service";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

function statusBadgeClass(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "manual_review_required" || status === "booking_pending" || status === "payment_pending") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "cancelled" || status === "payment_failed" || status === "booking_failed" || status === "payment_received_booking_failed") {
    return "bg-red-100 text-red-800";
  }
  if (status === "refunded" || status === "refund_pending") return "bg-purple-100 text-purple-800";
  return "bg-blue-100 text-blue-800";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function HotelBookingsAdminClient() {
  const [bookings, setBookings] = useState<HotelBookingRecord[]>([]);
  const [stats, setStats] = useState<HotelAdminStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [refundStatus, setRefundStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (refundStatus !== "all") params.set("refundStatus", refundStatus);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [q, status, paymentStatus, refundStatus, dateFrom, dateTo, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/api/admin/hotel-bookings?${queryString}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBookings(json.data.bookings ?? []);
      setStats(json.data.stats ?? null);
      setTotal(json.data.total ?? 0);
      setCanManage(Boolean(json.data.permissions?.canManage));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load hotel bookings");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, paymentStatus, refundStatus, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = () => {
    const header = [
      "Booking ID",
      "TripJack ID",
      "Customer",
      "Email",
      "Phone",
      "Hotel",
      "Check-in",
      "Check-out",
      "Total Fare",
      "Payment Status",
      "Booking Status",
      "Created At",
    ];
    const rows = bookings.map((b) => [
      b.bookingId,
      b.tripjackBookingId,
      b.customerName,
      b.customerEmail,
      b.customerMobile,
      b.hotelName,
      b.checkIn,
      b.checkOut,
      String(b.totalFare),
      b.paymentStatus,
      b.status,
      b.createdAt,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hotel-bookings-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAction = async (bookingId: string, action: string) => {
    if (!canManage) {
      toast.error("Only Super Admin can update bookings");
      return;
    }
    try {
      const res = await adminApiFetch(`/api/admin/hotel-bookings/${bookingId}`, {
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
      <AdminHeader title="Hotel Bookings (TripJack)" />
      <div className="space-y-6 p-6">
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Confirmed" value={stats.confirmed} />
            <StatCard label="Manual review" value={stats.manualReview} />
            <StatCard label="Revenue (paid)" value={formatCurrency(stats.totalRevenue, "en")} />
          </div>
        )}

        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search booking, hotel, customer…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="payment_pending">Payment pending</SelectItem>
                <SelectItem value="booking_pending">Booking pending</SelectItem>
                <SelectItem value="manual_review_required">Manual review</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="cancellation_requested">Cancellation requested</SelectItem>
                <SelectItem value="refund_pending">Refund pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="payment_failed">Payment failed</SelectItem>
                <SelectItem value="payment_received_booking_failed">Paid — book failed</SelectItem>
                <SelectItem value="booking_failed">Booking failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v ?? "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v ?? "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Refund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All refunds</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="MANUAL_REVIEW">Manual review</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
              No hotel bookings found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.bookingId}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-5">
                  <div>
                    <p className="font-semibold text-slate-900">{b.hotelName}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.customerName} · {b.customerEmail}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.checkIn} → {b.checkOut} · {b.bookingId}
                    </p>
                    {b.tripjackBookingId && (
                      <p className="text-xs font-mono text-muted-foreground">TJ: {b.tripjackBookingId}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge className={`border-0 ${statusBadgeClass(b.status)}`}>
                        {b.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline">{b.paymentStatus}</Badge>
                    </div>
                    <p className="mt-2 font-bold text-primary">{formatCurrency(b.totalFare, "en")}</p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/hotel-bookings/${b.bookingId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Details
                      </Link>
                      {canManage && b.status === "manual_review_required" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void runAction(b.bookingId, "mark_confirmed")}
                        >
                          Mark confirmed
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
