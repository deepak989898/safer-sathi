"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2, MapPin, ShieldCheck, User } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import {
  calculatePayNowAmount,
  getBalanceDue,
  type PaymentPlan,
} from "@/lib/payments/booking-payment";
import { useAppStore, useBookingCart } from "@/store/app-store";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { isDemoPaymentMode } from "@/lib/payments/razorpay-client";
import type { Booking } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Details", icon: User },
  { id: 2, label: "Review", icon: MapPin },
  { id: 3, label: "Payment", icon: CreditCard },
];

export function BookingCheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const { locale } = useAppStore();
  const { user } = useAuth();
  const cart = useBookingCart();
  const clearCart = useBookingCart((s) => s.clearCart);
  const { completeCatalogBooking, payExistingBooking, paying } = useTravelCheckout();

  const [step, setStep] = useState(1);
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(Boolean(bookingIdParam));
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");

  const loadPendingBooking = useCallback(async (bookingId: string) => {
    setLoadingBooking(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Booking not found");
      }

      const booking = json.data as Booking;
      if (booking.paymentStatus === "paid") {
        toast.info("This booking is already paid.");
        router.replace("/my-bookings");
        return;
      }

      setPendingBooking(booking);
      setForm({
        name: booking.customerName,
        email: booking.customerEmail,
        phone: booking.customerPhone,
      });
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load booking");
      setPendingBooking(null);
    } finally {
      setLoadingBooking(false);
    }
  }, [router]);

  useEffect(() => {
    if (bookingIdParam) {
      void loadPendingBooking(bookingIdParam);
    }
  }, [bookingIdParam, loadPendingBooking]);

  const progress = (step / steps.length) * 100;
  const demoMode = isDemoPaymentMode(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  const handleCartPay = async () => {
    if (!cart.serviceId || !form.name || !form.email || !form.phone) return;

    try {
      await completeCatalogBooking({
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        serviceType: (cart.serviceType || "package") as Booking["serviceType"],
        serviceId: cart.serviceId,
        serviceName: { en: cart.serviceName, hi: cart.serviceName },
        startDate: cart.startDate || new Date().toISOString().slice(0, 10),
        endDate: cart.endDate || undefined,
        guests: cart.guests,
        amount: cart.amount,
        paymentPlan,
        bookingMode: cart.bookingMode,
        distanceKm: cart.bookingMode === "km" ? cart.distanceKm : undefined,
        userId: user?.id,
      });

      clearCart();
      setStep(1);
      router.push("/my-bookings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed. Please try again.");
    }
  };

  const handlePendingPay = async () => {
    if (!pendingBooking) return;

    try {
      await payExistingBooking(pendingBooking, paymentPlan);
      router.push("/my-bookings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.");
    }
  };

  if (loadingBooking) {
    return (
      <>
        <PageHero title="Checkout" subtitle="Loading your booking..." image={HERO_IMAGES.checkout} />
        <section className="container mx-auto flex justify-center px-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </section>
      </>
    );
  }

  if (pendingBooking) {
    const serviceName = localizedText(pendingBooking.serviceName, locale);
    const payNow = calculatePayNowAmount(
      pendingBooking.amount,
      paymentPlan,
      pendingBooking.paidAmount ?? 0
    );
    const balanceDue = getBalanceDue(pendingBooking.amount, pendingBooking.paidAmount ?? 0);

    return (
      <>
        <PageHero
          title="Complete Payment"
          subtitle={`Booking ${pendingBooking.bookingNumber}`}
          image={HERO_IMAGES.checkout}
        />
        <section className="container mx-auto max-w-2xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Pay for your booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="font-semibold">{serviceName}</p>
                <p className="text-sm capitalize text-muted-foreground">
                  {pendingBooking.serviceType.replace("_", " ")}
                </p>
                <Separator className="my-3" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Start Date</span>
                    <span>{pendingBooking.startDate}</span>
                  </div>
                  {pendingBooking.endDate && (
                    <div className="flex justify-between">
                      <span>End Date</span>
                      <span>{pendingBooking.endDate}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total amount</span>
                    <span className="text-primary">
                      {formatCurrency(pendingBooking.amount, locale)}
                    </span>
                  </div>
                  {(pendingBooking.paidAmount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Paid so far</span>
                      <span>{formatCurrency(pendingBooking.paidAmount ?? 0, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Pay now</span>
                    <span>{formatCurrency(payNow, locale)}</span>
                  </div>
                  {balanceDue > payNow && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Balance later</span>
                      <span>{formatCurrency(balanceDue - payNow, locale)}</span>
                    </div>
                  )}
                </div>
              </div>

              {pendingBooking.paymentFailureReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Last payment failed: {pendingBooking.paymentFailureReason}
                </div>
              )}

              <PaymentPlanSelector
                totalAmount={pendingBooking.amount}
                value={paymentPlan}
                onChange={setPaymentPlan}
                locale={locale}
                paidAmount={pendingBooking.paidAmount ?? 0}
              />

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Secure payment via Razorpay</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {demoMode
                        ? "Demo mode is active. Payment will be simulated until Razorpay keys are set in Vercel."
                        : "Complete payment to confirm your booking."}
                    </p>
                  </div>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={() => void handlePendingPay()} disabled={paying}>
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay {formatCurrency(payNow, locale)} with Razorpay</>
                )}
              </Button>
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  if (!cart.serviceId) {
    return (
      <>
        <PageHero
          title="Checkout"
          subtitle="Complete your booking"
          image={HERO_IMAGES.checkout}
        />
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">No booking selected yet.</p>
          <Link href="/packages">
            <Button className="mt-4">Browse Packages</Button>
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Checkout"
        subtitle="Complete your booking in 3 easy steps"
        image={HERO_IMAGES.checkout}
      />

      <section className="container mx-auto max-w-2xl px-4 py-10">
        <Progress value={progress} className="mb-8" />

        <div className="mb-8 flex justify-between">
          {steps.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-1 text-sm",
                step >= s.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2",
                  step >= s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted"
                )}
              >
                {step > s.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Traveler Details"}
              {step === 2 && "Review Booking"}
              {step === 3 && "Payment"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-semibold">{cart.serviceName}</p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {cart.serviceType.replace("_", " ")}
                  </p>
                  <Separator className="my-3" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Start Date</span>
                      <span>{cart.startDate || "—"}</span>
                    </div>
                    {cart.endDate && (
                      <div className="flex justify-between">
                        <span>End Date</span>
                        <span>{cart.endDate}</span>
                      </div>
                    )}
                    {cart.bookingMode === "km" && cart.distanceKm > 0 && (
                      <div className="flex justify-between">
                        <span>Distance</span>
                        <span>{cart.distanceKm} km</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatCurrency(cart.amount, locale)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Name: {form.name}</p>
                  <p>Email: {form.email}</p>
                  <p>Phone: {form.phone}</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <PaymentPlanSelector
                  totalAmount={cart.amount}
                  value={paymentPlan}
                  onChange={setPaymentPlan}
                  locale={locale}
                />
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Secure payment via Razorpay</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {demoMode
                          ? "Demo mode is active. Payment will be simulated until you add Razorpay keys in Vercel."
                          : "You will be redirected to Razorpay checkout to complete payment safely."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between font-bold">
                    <span>Pay now</span>
                    <span className="text-primary">
                      {formatCurrency(calculatePayNowAmount(cart.amount, paymentPlan), locale)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={paying}>
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  className="flex-1"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!form.name || !form.email || !form.phone)}
                >
                  Continue
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => void handleCartPay()} disabled={paying}>
                  {paying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Pay {formatCurrency(calculatePayNowAmount(cart.amount, paymentPlan), locale)} with Razorpay</>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
