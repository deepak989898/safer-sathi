"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAppStore, useBookingCart } from "@/store/app-store";
import { formatCurrency } from "@/lib/i18n";
import {
  isDemoPaymentMode,
  openRazorpayCheckout,
} from "@/lib/payments/razorpay-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Details", icon: User },
  { id: 2, label: "Review", icon: MapPin },
  { id: 3, label: "Payment", icon: CreditCard },
];

export default function BookingPage() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const cart = useBookingCart();
  const clearCart = useBookingCart((s) => s.clearCart);
  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });

  const progress = (step / steps.length) * 100;

  const handlePay = async () => {
    if (!cart.serviceId || !form.name || !form.email || !form.phone) return;

    setPaying(true);
    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          serviceType: cart.serviceType || "package",
          serviceId: cart.serviceId,
          serviceName: { en: cart.serviceName, hi: cart.serviceName },
          startDate: cart.startDate || new Date().toISOString().slice(0, 10),
          endDate: cart.endDate || undefined,
          guests: cart.guests,
          amount: cart.amount,
          userId: user?.id,
        }),
      });
      const bookingJson = await bookingRes.json();
      if (!bookingJson.success) {
        throw new Error(bookingJson.error ?? "Failed to create booking");
      }

      const booking = bookingJson.data;
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cart.amount,
          receipt: booking.bookingNumber,
          notes: {
            bookingId: booking.id,
            serviceType: cart.serviceType,
          },
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        throw new Error(orderJson.error ?? "Failed to create payment order");
      }

      const order = orderJson.data;
      const payment = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Safar Sathi",
        description: cart.serviceName,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        demo: order.demo,
      });

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          razorpaySignature: payment.razorpaySignature,
          bookingId: booking.id,
          amount: cart.amount,
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) {
        throw new Error(verifyJson.error ?? "Payment verification failed");
      }

      clearCart();
      setStep(1);
      toast.success(`Booking confirmed! Reference: ${booking.bookingNumber}`);
      router.push("/my-bookings");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Booking failed. Please try again.";
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  if (!cart.serviceId) {
    return (
      <>
        <PageHero
          title="Checkout"
          subtitle="Complete your booking"
          image={HERO_IMAGES.checkout}
        />
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link href="/packages">
            <Button className="mt-4">Browse Packages</Button>
          </Link>
        </section>
      </>
    );
  }

  const demoMode = isDemoPaymentMode(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

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
                    <div className="flex justify-between">
                      <span>Guests</span>
                      <span>{cart.guests}</span>
                    </div>
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
                    <span>Amount to pay</span>
                    <span className="text-primary">
                      {formatCurrency(cart.amount, locale)}
                    </span>
                  </div>
                </div>
                {demoMode && (
                  <p className="text-xs text-muted-foreground">
                    Set `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, and
                    `RAZORPAY_KEY_SECRET` in Vercel for live payments.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={paying}
                >
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
                <Button className="flex-1" onClick={handlePay} disabled={paying}>
                  {paying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Pay {formatCurrency(cart.amount, locale)} with Razorpay</>
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
