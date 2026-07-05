"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Download, ExternalLink, Printer } from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import { customerApiFetch } from "@/lib/admin/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { canCancelHotelBooking } from "@/lib/hotels/booking-guards";
import type { HotelBookingRecord, HotelBookingStatus } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS: Array<{ id: string; label: string; statuses: HotelBookingStatus[] | "all"; refund?: boolean }> = [
  { id: "all", label: "All", statuses: "all" },
  {
    id: "upcoming",
    label: "Upcoming",
    statuses: ["review_confirmed", "payment_pending", "payment_success", "booking_pending", "confirmed"],
  },
  { id: "completed", label: "Completed", statuses: ["confirmed"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "cancellation_requested"] },
  {
    id: "refund_pending",
    label: "Refund Pending",
    statuses: ["refund_pending"],
    refund: true,
  },
  {
    id: "manual",
    label: "Manual Review",
    statuses: ["manual_review_required", "booking_failed", "payment_failed"],
  },
];

function statusTone(status: HotelBookingStatus) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "manual_review_required" || status === "booking_pending") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "payment_failed" || status === "booking_failed" || status === "cancelled") {
    return "bg-red-100 text-red-800";
  }
  return "bg-blue-100 text-[#1a4fa3]";
}

function HotelBookingsContent() {
  const { locale } = useAppStore();
  const api = useHotelBookingApi();
  const [bookings, setBookings] = useState<HotelBookingRecord[]>([]);
  const [tab, setTab] = useState("upcoming");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void api.fetchMyBookings().then((data) => data && setBookings(data));
  }, []);

  const filtered = useMemo(() => {
    const config = TABS.find((t) => t.id === tab);
    if (!config || config.statuses === "all") return bookings;
    if (config.refund) {
      return bookings.filter(
        (b) =>
          b.status === "refund_pending" ||
          b.refundStatus === "PENDING" ||
          b.refundStatus === "PROCESSING"
      );
    }
    return bookings.filter((b) => config.statuses.includes(b.status));
  }, [bookings, tab]);

  const downloadInvoice = async (booking: HotelBookingRecord) => {
    setDownloadingId(booking.bookingId);
    try {
      const res = await customerApiFetch(`/api/hotels/bookings/${booking.bookingId}/invoice`);
      if (!res.ok) throw new Error("Could not download invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SafarSathi-Hotel-Invoice-${booking.confirmationNumber ?? booking.bookingId.slice(-8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoice download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-gradient-to-r from-[#1a4fa3] to-[#2563c9] text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold md:text-3xl">My Hotel Bookings</h1>
          <p className="mt-1 text-sm text-blue-100">TripJack hotel reservations</p>
        </div>
      </div>

      <section className="container mx-auto space-y-5 px-4 py-8">
        <Link
          href="/hotels/search"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a4fa3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16408a]"
        >
          <Building2 className="h-4 w-4" />
          Book a new hotel
        </Link>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              className={cn("rounded-full", tab === t.id && "bg-[#1a4fa3] hover:bg-[#16408a]")}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border bg-white py-12 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-900">No bookings in this category</p>
          </div>
        )}

        {filtered.map((b) => (
          <div key={b.bookingId} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-slate-900">{b.hotelName}</p>
                <p className="text-sm text-slate-600">
                  {b.checkIn} → {b.checkOut} · {b.roomName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {b.confirmationNumber ? `Voucher ${b.confirmationNumber}` : b.bookingId}
                </p>
              </div>
              <div className="text-right">
                <Badge className={`border-0 ${statusTone(b.status)}`}>
                  {b.status.replace(/_/g, " ")}
                </Badge>
                <p className="mt-2 text-lg font-bold text-[#1a4fa3]">
                  {formatCurrency(b.totalFare, locale)}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Link href={`/hotels/booking/${b.bookingId}`}>
                    <Button size="sm" variant="outline" className="rounded-xl">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/hotels/voucher/${b.bookingId}`}>
                    <Button size="sm" variant="outline" className="rounded-xl">
                      <Printer className="mr-1 h-3.5 w-3.5" />
                      Print
                    </Button>
                  </Link>
                  {b.paymentStatus === "paid" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={downloadingId === b.bookingId}
                      onClick={() => void downloadInvoice(b)}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Invoice
                    </Button>
                  )}
                  {canCancelHotelBooking(b) && (
                    <Link href={`/hotels/booking/${b.bookingId}`}>
                      <Button size="sm" variant="outline" className="rounded-xl text-red-700">
                        Cancel
                      </Button>
                    </Link>
                  )}
                  {b.voucherUrl && (
                    <a href={b.voucherUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-xl">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Voucher
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AccountHotelBookingsPage() {
  return (
    <RequireAuth>
      <HotelBookingsContent />
    </RequireAuth>
  );
}
