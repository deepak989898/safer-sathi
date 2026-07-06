"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { adminApiFetch } from "@/lib/admin/api-client";
import { getAdminNotesHistory } from "@/lib/flights/admin-notes";
import { FlightPipelineStatusBadge } from "@/components/flights/flight-pipeline-status-badge";
import { AirlineLogo } from "@/components/flights/airline-logo";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default function FlightBookingDetailAdminClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const [booking, setBooking] = useState<FlightBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [canViewFull, setCanViewFull] = useState(false);
  const [canViewRaw, setCanViewRaw] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/api/admin/flight-bookings/${bookingId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBooking(json.data.booking);
      setCanManage(Boolean(json.data.permissions?.canManage));
      setCanViewFull(Boolean(json.data.permissions?.canViewFull));
      setCanViewRaw(Boolean(json.data.permissions?.canViewRaw));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: string, extra?: { note?: string }) => {
    setActing(true);
    try {
      const res = await adminApiFetch(`/api/admin/flight-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: extra?.note }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBooking(json.data.booking);
      setNote("");
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Flight Booking" />
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading booking…
        </div>
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <AdminHeader title="Flight Booking" />
        <div className="p-6 text-center">
          <p className="font-semibold">Booking not found</p>
          <Link href="/admin/flight-bookings" className="mt-4 inline-block text-sm text-primary">
            Back to list
          </Link>
        </div>
      </>
    );
  }

  const details = booking.bookingDetailNormalized ?? booking.normalizedBookingDetails;
  const notes = getAdminNotesHistory(booking);
  const review = booking.reviewNormalized;
  const validated = booking.fareValidateNormalized;

  return (
    <>
      <AdminHeader title={`Flight · ${booking.bookingId}`} />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/flight-bookings"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to flight bookings
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/flights/ticket/${booking.bookingId}`}
              target="_blank"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Customer ticket
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/flights/ticket/${booking.bookingId}`, "_blank")}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print / Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={acting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
        </div>

        <Section title="1. Booking Overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Booking ID" value={<span className="font-mono text-xs">{booking.bookingId}</span>} />
            <Field
              label="TripJack booking ID"
              value={<span className="font-mono text-xs">{booking.tripjackBookingId}</span>}
            />
            <Field
              label="Customer"
              value={
                <>
                  {booking.customerName}
                  <br />
                  <span className="text-xs font-normal text-muted-foreground">
                    {booking.customerEmail} · {booking.customerMobile}
                  </span>
                </>
              }
            />
            <Field
              label="Payment status"
              value={<Badge variant="secondary">{booking.paymentStatus}</Badge>}
            />
            <Field
              label="Booking status"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{booking.status.replace(/_/g, " ")}</Badge>
                  <FlightPipelineStatusBadge booking={booking} />
                </div>
              }
            />
            <Field label="TripJack book status" value={booking.tripjackBookingStatus || "—"} />
            <Field label="Ticket status" value={booking.ticketStatus || booking.ticketNumber} />
            <Field label="Cancellation / refund" value={booking.refundStatus || "—"} />
            <Field label="Created" value={new Date(booking.createdAt).toLocaleString("en-IN")} />
            <Field label="Updated" value={new Date(booking.updatedAt).toLocaleString("en-IN")} />
            {booking.manualReviewResolved && (
              <Field
                label="Manual review resolved"
                value={`${booking.manualReviewResolvedBy} · ${booking.manualReviewResolvedAt ? new Date(booking.manualReviewResolvedAt).toLocaleString("en-IN") : ""}`}
              />
            )}
          </div>
        </Section>

        <Section title="2. Flight Details">
          <div className="mb-4 flex items-center gap-3">
            <AirlineLogo code={booking.airlineCode} name={booking.airlineName} size={52} />
            <div>
              <p className="font-semibold text-slate-900">{booking.airlineName}</p>
              <p className="text-sm text-muted-foreground">
                {booking.airlineCode} {booking.flightNumber}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Airline" value={`${booking.airlineName} (${booking.airlineCode})`} />
            <Field label="Flight number" value={booking.flightNumber} />
            <Field
              label="Route"
              value={`${booking.sourceCity || booking.sourceCode} → ${booking.destinationCity || booking.destinationCode}`}
            />
            <Field
              label="Airports"
              value={`${booking.sourceCode} → ${booking.destinationCode}`}
            />
            <Field
              label="Departure / Arrival"
              value={`${booking.departureTime} – ${booking.arrivalTime}`}
            />
            <Field label="Duration" value={booking.durationFormatted} />
            <Field
              label="Stops"
              value={
                details?.flightSegments
                  ? Math.max(0, details.flightSegments.length - 1)
                  : review?.stops ?? "—"
              }
            />
            <Field
              label="Cabin class"
              value={review?.cabinClass || validated?.fareIdentifier || booking.fareIdentifier}
            />
            <Field
              label="Baggage"
              value={
                review
                  ? `Cabin ${review.cabinBaggage} · Check-in ${review.checkinBaggage}`
                  : validated
                    ? `Cabin ${validated.baggage?.cabin} · Check-in ${validated.baggage?.checkin}`
                    : "—"
              }
            />
          </div>
        </Section>

        <Section title="3. Passenger Details">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Gender</th>
                  <th className="py-2 pr-3">DOB</th>
                  <th className="py-2 pr-3">Nationality</th>
                  <th className="py-2 pr-3">Passport</th>
                  <th className="py-2 pr-3">Ticket</th>
                  <th className="py-2">Seat</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((p, i) => {
                  const detailPax = details?.passengers?.[i];
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {p.ti} {p.fN} {p.lN}
                      </td>
                      <td className="py-2 pr-3">{p.pt}</td>
                      <td className="py-2 pr-3">{p.gender || "—"}</td>
                      <td className="py-2 pr-3">{p.dateOfBirth || "—"}</td>
                      <td className="py-2 pr-3">{p.nationality || "—"}</td>
                      <td className="py-2 pr-3">{p.passportNumber || "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {detailPax?.ticketNumber || booking.ticketNumber || "—"}
                      </td>
                      <td className="py-2">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {(canViewFull || canManage) && (
          <Section title="4. Fare & Payment">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Base fare" value={formatCurrency(booking.baseFare, "en")} />
              <Field label="Taxes" value={formatCurrency(booking.taxesAndFees, "en")} />
              <Field label="Total fare" value={formatCurrency(booking.totalFare, "en")} />
              <Field
                label="Razorpay order ID"
                value={<span className="font-mono text-xs">{booking.razorpayOrderId}</span>}
              />
              <Field
                label="Razorpay payment ID"
                value={<span className="font-mono text-xs">{booking.razorpayPaymentId}</span>}
              />
              <Field
                label="Payment verified"
                value={booking.razorpaySignatureVerified ? "Yes" : "No"}
              />
              <Field label="Payment amount" value={formatCurrency(booking.totalFare, "en")} />
              <Field
                label="Payment time"
                value={
                  booking.paymentStatus === "paid"
                    ? new Date(booking.updatedAt).toLocaleString("en-IN")
                    : "—"
                }
              />
            </div>
          </Section>
        )}

        {canViewFull && (
          <Section title="5. TripJack API Status">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Review</p>
                <p className="text-muted-foreground">
                  {review
                    ? `${review.airlineCode} ${review.flightNumber} · ₹${review.totalFare} · bookingId ${review.bookingId || "—"}`
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Fare validate</p>
                <p className="text-muted-foreground">
                  {validated
                    ? `₹${validated.totalFare} · bookingId ${validated.bookingId || "—"}`
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Book</p>
                <p className="text-muted-foreground">
                  {booking.bookResponse
                    ? `Attempted · ${booking.tripjackBookingStatus || "saved"}`
                    : "Not available"}
                </p>
                {booking.bookError && (
                  <p className="mt-1 text-xs text-red-700">{booking.bookError}</p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold">Booking detail</p>
                <p className="text-muted-foreground">
                  {details
                    ? `Order ${details.orderStatus} · PNR ${details.pnr || "—"}`
                    : "Not refreshed yet"}
                </p>
              </div>
            </div>

            {canViewRaw && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Raw API Logs (Super Admin only)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-[10px] text-slate-100">
                  {JSON.stringify(
                    {
                      bookRequest: booking.bookRequest,
                      bookErrorDetail: booking.bookErrorDetail,
                      reviewResponse: booking.reviewResponse,
                      fareValidateResponse: booking.fareValidateResponse,
                      bookResponse: booking.bookResponse,
                      bookingDetailResponse:
                        booking.bookingDetailResponse || booking.bookingDetailsResponse,
                      getChargesResponse: booking.getChargesResponse,
                      submitAmendmentResponse: booking.submitAmendmentResponse,
                      pollAmendmentResponse: booking.pollAmendmentResponse,
                      releasePnrResponse: booking.releasePnrResponse,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </Section>
        )}

        <Section title="6. Cancellation / Refund">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Amendment ID" value={booking.amendmentId} />
            <Field
              label="Cancellation charges"
              value={
                typeof booking.cancellationCharges === "number"
                  ? formatCurrency(booking.cancellationCharges, "en")
                  : "—"
              }
            />
            <Field
              label="Refundable amount"
              value={
                typeof booking.refundAmount === "number"
                  ? formatCurrency(booking.refundAmount, "en")
                  : "—"
              }
            />
            <Field label="Cancellation status" value={booking.status} />
            <Field label="Refund status" value={booking.refundStatus} />
            <Field label="Poll status" value={booking.pollStatus} />
          </div>
          {canManage && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={acting}
                onClick={() => void runAction("refresh_detail")}
              >
                Refresh booking details
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={acting || !booking.amendmentId}
                onClick={() => void runAction("retry_poll")}
              >
                Retry poll
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={acting}
                onClick={() => void runAction("retry_booking_detail")}
              >
                Retry booking details API
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={acting}
                onClick={() => void runAction("retry_book")}
              >
                Retry TripJack Book
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={acting}
                onClick={() => void runAction("retry_release_pnr")}
              >
                Retry release PNR
              </Button>
              {(booking.status === "manual_review_required" ||
                booking.status === "payment_received_booking_failed") && (
                <Button
                  size="sm"
                  disabled={acting}
                  onClick={() => void runAction("mark_resolved", { note: note || undefined })}
                >
                  Mark manual review resolved
                </Button>
              )}
            </div>
          )}
        </Section>

        <Section title="7. Admin Notes">
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground">No admin notes yet.</p>
            )}
            {notes.map((n, i) => (
              <div key={i} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <p>{n.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.adminName} · {new Date(n.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
            {(canViewFull || canManage) && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add admin note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={acting || !note.trim()}
                  onClick={() => void runAction("add_note", { note })}
                >
                  Add note
                </Button>
              </div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
