"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApiFetch } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import type { Booking } from "@/types";
import { toast } from "sonner";

interface RecoveryPreview {
  bookingNumber: string;
  found: boolean;
  canRecover: boolean;
  source: string;
  storedBookingId?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  warnings: string[];
  booking: Booking | null;
  razorpayPayment?: {
    id: string;
    amount: number;
    status: string;
    captured: boolean;
  };
  razorpayOrder?: {
    id: string;
    receipt: string;
    amountPaid: number;
    status: string;
  };
  suggestedPaidAmount?: number;
}

interface RecoverPaidBookingCardProps {
  onRecovered?: (booking: Booking) => void;
}

export function RecoverPaidBookingCard({ onRecovered }: RecoverPaidBookingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bookingNumber, setBookingNumber] = useState("");
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");
  const [razorpayOrderId, setRazorpayOrderId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams({ bookingNumber: bookingNumber.trim() });
    if (razorpayPaymentId.trim()) params.set("razorpayPaymentId", razorpayPaymentId.trim());
    if (razorpayOrderId.trim()) params.set("razorpayOrderId", razorpayOrderId.trim());
    return params.toString();
  };

  const handlePreview = async () => {
    if (!bookingNumber.trim()) {
      toast.error("Enter a booking number (e.g. SS-2026-308831)");
      return;
    }

    setPreviewing(true);
    try {
      const res = await adminApiFetch(`/api/admin/bookings/recover?${buildQuery()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Preview failed");
      }

      const data = json.data as RecoveryPreview;
      setPreview(data);
      if (data.suggestedPaidAmount) {
        setPaidAmount(String(data.suggestedPaidAmount));
      }
      if (!data.found && !data.canRecover) {
        toast.warning("Booking record not found — check warnings below.");
      } else if (data.canRecover && !data.found) {
        toast.message("Booking can be rebuilt from Razorpay — review and recover.");
      } else {
        toast.success("Booking located — review details before recovering.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not preview recovery");
    } finally {
      setPreviewing(false);
    }
  };

  const handleRecover = async () => {
    if (!bookingNumber.trim()) {
      toast.error("Booking number is required");
      return;
    }

    setRecovering(true);
    try {
      const res = await adminApiFetch("/api/admin/bookings/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingNumber: bookingNumber.trim(),
          razorpayPaymentId: razorpayPaymentId.trim() || undefined,
          razorpayOrderId: razorpayOrderId.trim() || undefined,
          paidAmount: paidAmount ? Number(paidAmount) : undefined,
          sendConfirmation,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Recovery failed");
      }

      const booking = json.data.booking as Booking;
      toast.success(
        `Booking ${booking.bookingNumber} recovered and confirmed. Customer login password: ${booking.bookingNumber}`
      );
      onRecovered?.(booking);
      setPreview(null);
      setBookingNumber("");
      setRazorpayPaymentId("");
      setRazorpayOrderId("");
      setPaidAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not recover booking");
    } finally {
      setRecovering(false);
    }
  };

  return (
    <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-[#0c2444]">
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Recover paid booking
            </CardTitle>
            <CardDescription className="mt-1">
              Use when Razorpay payment succeeded but the site showed &quot;Booking not found&quot;.
              Confirms the booking, saves it, emails the customer, and sets login password to the
              Booking ID.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide" : "Open tool"}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t border-amber-200/60 pt-4 dark:border-amber-900/40">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="recover-booking-number">Booking ID</Label>
              <Input
                id="recover-booking-number"
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="SS-2026-308831"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="recover-paid-amount">Paid amount (₹)</Label>
              <Input
                id="recover-paid-amount"
                type="number"
                min={1}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Auto-filled from Razorpay if available"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="recover-payment-id">Razorpay Payment ID (recommended)</Label>
              <Input
                id="recover-payment-id"
                value={razorpayPaymentId}
                onChange={(e) => setRazorpayPaymentId(e.target.value)}
                placeholder="pay_xxxxxxxxxxxx"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="recover-order-id">Razorpay Order ID (optional)</Label>
              <Input
                id="recover-order-id"
                value={razorpayOrderId}
                onChange={(e) => setRazorpayOrderId(e.target.value)}
                placeholder="order_xxxxxxxxxxxx"
                className="mt-1.5"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendConfirmation}
              onChange={(e) => setSendConfirmation(e.target.checked)}
              className="rounded border-input"
            />
            Send confirmation email, WhatsApp, and SMS to customer
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handlePreview()}
              disabled={previewing || recovering}
            >
              {previewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Preview
            </Button>
            <Button
              type="button"
              onClick={() => void handleRecover()}
              disabled={recovering || previewing || !preview?.canRecover}
            >
              {recovering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Recover &amp; confirm
            </Button>
          </div>

          {preview && (
            <div className="rounded-lg border bg-background p-4 text-sm">
              {preview.found && preview.booking ? (
                <div className="space-y-2">
                  <p className="font-medium text-[#0c2444]">
                    {preview.booking.customerName} · {preview.booking.serviceName.en}
                  </p>
                  <p className="text-muted-foreground">
                    Status: {preview.booking.status} · Payment: {preview.booking.paymentStatus}
                  </p>
                  <p className="text-muted-foreground">
                    Total {formatCurrency(preview.booking.amount)} · Currently paid{" "}
                    {formatCurrency(preview.booking.paidAmount ?? 0)}
                  </p>
                  {preview.razorpayPayment && (
                    <p className="text-emerald-700 dark:text-emerald-400">
                      Razorpay payment {preview.razorpayPayment.id}:{" "}
                      {formatCurrency(preview.razorpayPayment.amount)} ({preview.razorpayPayment.status})
                    </p>
                  )}
                </div>
              ) : preview.canRecover ? (
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    Booking missing from database, but Razorpay payment can rebuild it.
                    {preview.notificationTitle
                      ? ` Notification: "${preview.notificationTitle}".`
                      : ""}
                  </p>
                  {preview.razorpayPayment && (
                    <p className="text-muted-foreground">
                      Razorpay payment {preview.razorpayPayment.id}:{" "}
                      {formatCurrency(preview.razorpayPayment.amount)} ({preview.razorpayPayment.status})
                    </p>
                  )}
                </div>
              ) : (
                <p className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Booking record not found in database.
                  {preview.notificationTitle
                    ? ` Notification found: "${preview.notificationTitle}".`
                    : ""}
                </p>
              )}

              {preview.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
