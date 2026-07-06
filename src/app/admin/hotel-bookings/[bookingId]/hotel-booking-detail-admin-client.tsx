"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

export default function HotelBookingDetailAdminClient({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canUpdateRefund, setCanUpdateRefund] = useState(false);
  const [refundReference, setRefundReference] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await adminApiFetch(`/api/admin/hotel-bookings/${bookingId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBooking(json.data.booking);
      setCanManage(Boolean(json.data.permissions?.canManage));
      setCanUpdateRefund(Boolean(json.data.permissions?.canUpdateRefund));
      setRefundReference(json.data.booking.refundReference ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [bookingId]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      const res = await adminApiFetch(`/api/admin/hotel-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBooking(json.data.booking);
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Hotel Booking" />
        <p className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <AdminHeader title="Hotel Booking" />
        <div className="p-6">
          <p>Booking not found</p>
          <Link href="/admin/hotel-bookings" className="mt-4 inline-block text-primary">
            Back to list
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Hotel Booking Detail" />
      <div className="space-y-4 p-6">
        <Link href="/admin/hotel-bookings" className="inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to hotel bookings
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">{booking.hotelName}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{booking.bookingId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{booking.status.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{booking.paymentStatus}</Badge>
                {booking.refundStatus && booking.refundStatus !== "NONE" && (
                  <Badge variant="outline">Refund: {booking.refundStatus}</Badge>
                )}
                {booking.cancellationStatus && booking.cancellationStatus !== "NONE" && (
                  <Badge variant="outline">Cancel: {booking.cancellationStatus}</Badge>
                )}
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
              <Item label="Customer" value={`${booking.customerName} (${booking.customerEmail})`} />
              <Item label="Mobile" value={booking.customerMobile} />
              <Item label="TripJack ID" value={booking.tripjackBookingId} />
              <Item label="Razorpay payment" value={booking.razorpayPaymentId ?? "—"} />
              <Item label="Supplier ref" value={booking.supplierReference ?? "—"} />
              <Item label="Confirmation" value={booking.confirmationNumber ?? "—"} />
              <Item label="Voucher URL" value={booking.voucherUrl ?? "—"} />
              <Item label="Dates" value={`${booking.checkIn} → ${booking.checkOut}`} />
              <Item label="Amount" value={formatCurrency(booking.totalFare, "en")} />
              {booking.cancellationCharge != null && (
                <Item label="Cancellation charge" value={formatCurrency(booking.cancellationCharge, "en")} />
              )}
              {booking.expectedRefundAmount != null && (
                <Item label="Expected refund" value={formatCurrency(booking.expectedRefundAmount, "en")} />
              )}
              {booking.refundReference && <Item label="Refund reference" value={booking.refundReference} />}
            </dl>

            {booking.adminNotes && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{booking.adminNotes}</div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {(canManage || canUpdateRefund) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === "refresh_status"}
                  onClick={() => void runAction("refresh_status")}
                >
                  Refresh status
                </Button>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => void runAction("resend_email")}>
                    Resend confirmation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void runAction("resend_voucher_email")}>
                    Resend voucher email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void runAction("mark_voucher_sent")}>
                    Mark voucher sent
                  </Button>
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700"
                      disabled={actionLoading === "cancel_booking"}
                      onClick={() => void runAction("cancel_booking", { remarks: "Admin cancellation" })}
                    >
                      Cancel via TripJack
                    </Button>
                  )}
                </>
              )}
            </div>

            {canUpdateRefund && (
              <div className="mt-6 space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">Refund management</p>
                <Input
                  placeholder="Refund reference (UTR / Razorpay refund ID)"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                />
                <Input
                  placeholder="Refund note"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void runAction("add_refund_reference", {
                        refundReference,
                        refundNote,
                      })
                    }
                  >
                    Save reference
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runAction("mark_refund_processing")}
                  >
                    Mark processing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      void runAction("mark_refunded", {
                        refundReference,
                        refundNote,
                        refundAmount: booking.expectedRefundAmount,
                      })
                    }
                  >
                    Mark refunded
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(Boolean(booking.bookingDetailsResponse) || Boolean(booking.cancellationResponse) || (booking.actionLog?.length ?? 0) > 0) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {booking.bookingDetailsResponse != null && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Booking details response</p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(booking.bookingDetailsResponse, null, 2)}
                  </pre>
                </div>
              )}
              {booking.cancellationResponse != null ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Cancellation response</p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(booking.cancellationResponse, null, 2)}
                  </pre>
                </div>
              ) : null}
              {booking.actionLog?.length ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Action log</p>
                  <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(booking.actionLog.slice(-10), null, 2)}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-all">{value}</dd>
    </div>
  );
}
