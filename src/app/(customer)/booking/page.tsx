"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CreditCard, MapPin, User } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAppStore, useBookingCart } from "@/store/app-store";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Details", icon: User },
  { id: 2, label: "Review", icon: MapPin },
  { id: 3, label: "Payment", icon: CreditCard },
];

export default function BookingPage() {
  const { locale } = useAppStore();
  const cart = useBookingCart();
  const clearCart = useBookingCart((s) => s.clearCart);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const progress = (step / steps.length) * 100;

  const handleConfirm = async () => {
    try {
      const res = await fetch("/api/bookings", {
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
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast.success(`Booking confirmed! Reference: ${json.data.bookingNumber}`);
      clearCart();
      setStep(1);
    } catch {
      toast.error("Booking failed. Please try again.");
    }
  };

  if (!cart.serviceId) {
    return (
      <>
        <PageHero title="Checkout" subtitle="Complete your booking" />
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link href="/packages">
            <Button className="mt-4">Browse Packages</Button>
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero title="Checkout" subtitle="Complete your booking in 3 easy steps" />

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
              <>
                <div>
                  <Label>Card Number</Label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={form.cardNumber}
                    onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Expiry</Label>
                    <Input
                      placeholder="MM/YY"
                      value={form.expiry}
                      onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <Input
                      placeholder="123"
                      value={form.cvv}
                      onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Secure payment powered by Razorpay. Your payment details are encrypted.
                </p>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
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
                <Button className="flex-1" onClick={handleConfirm}>
                  Confirm & Pay {formatCurrency(cart.amount, locale)}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
