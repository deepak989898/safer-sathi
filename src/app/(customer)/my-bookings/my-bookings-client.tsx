"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, MapPin, Users } from "lucide-react";
import { ChangePasswordCard } from "@/components/customer/change-password-card";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { customerApiFetch } from "@/lib/admin/api-client";
import { listBookingsFromClient } from "@/lib/bookings/booking-client";
import { useAppStore } from "@/store/app-store";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { cn } from "@/lib/utils";

const paymentColors: Record<PaymentStatus, string> = {
  pending: "text-amber-600",
  partial: "text-blue-600",
  paid: "text-emerald-600",
  failed: "text-destructive",
  refunded: "text-muted-foreground",
};

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function MyBookingsClient() {
  const { user } = useAuth();
  const { locale } = useAppStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const userEmail = user.email.toLowerCase();
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await customerApiFetch("/api/bookings");
        const json = await res.json();
        let items: Booking[] = json.success ? (json.data ?? []) : [];

        items = items.filter(
          (booking) =>
            booking.userId === userId ||
            booking.customerEmail.toLowerCase() === userEmail
        );

        if (items.length === 0) {
          const clientItems = await listBookingsFromClient(200);
          items = clientItems.filter(
            (booking) =>
              booking.userId === userId ||
              booking.customerEmail.toLowerCase() === userEmail
          );
        }

        if (!cancelled) {
          setBookings(
            items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleBookings = useMemo(() => bookings, [bookings]);

  const filterByStatus = (statuses: BookingStatus[]) =>
    visibleBookings.filter((b) => statuses.includes(b.status));

  const tabs = [
    { value: "all", label: "All", items: visibleBookings },
    {
      value: "upcoming",
      label: t(locale, "common", "upcoming"),
      items: filterByStatus(["upcoming", "confirmed", "pending"]),
    },
    {
      value: "completed",
      label: t(locale, "common", "completed"),
      items: filterByStatus(["completed"]),
    },
    {
      value: "cancelled",
      label: t(locale, "common", "cancelled"),
      items: filterByStatus(["cancelled", "refunded"]),
    },
  ];

  return (
    <>
      <PageHero
        title="My Bookings"
        subtitle="Manage and track all your travel reservations"
        image={HERO_IMAGES.myBookings}
      />

      <section className="container mx-auto px-4 py-10">
        <ChangePasswordCard />
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your bookings...
          </div>
        ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {tab.items.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.items.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground">No bookings found.</p>
                  <Link href="/packages">
                    <Button className="mt-4">Explore Packages</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {tab.items.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {localizedText(booking.serviceName, locale)}
                            </p>
                            <Badge
                              className={cn("capitalize", statusColors[booking.status])}
                              variant="secondary"
                            >
                              {t(locale, "common", booking.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {booking.bookingNumber}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {booking.startDate}
                              {booking.endDate && ` → ${booking.endDate}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {booking.guests} guests
                            </span>
                            <span className="flex items-center gap-1 capitalize">
                              <MapPin className="h-3.5 w-3.5" />
                              {booking.serviceType.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(booking.amount, locale)}
                          </p>
                          <p className={cn("text-xs capitalize", paymentColors[booking.paymentStatus])}>
                            {booking.paymentStatus}
                            {(booking.paidAmount ?? 0) > 0 &&
                              ` · paid ${formatCurrency(booking.paidAmount ?? 0, locale)}`}
                          </p>
                          {booking.paymentFailureReason && (
                            <p className="mt-1 max-w-[220px] text-xs text-destructive">
                              {booking.paymentFailureReason}
                            </p>
                          )}
                          {getBalanceDue(booking.amount, booking.paidAmount ?? 0) > 0 &&
                            booking.paymentStatus !== "failed" && (
                              <p className="text-xs text-muted-foreground">
                                Balance:{" "}
                                {formatCurrency(
                                  getBalanceDue(booking.amount, booking.paidAmount ?? 0),
                                  locale
                                )}
                              </p>
                            )}
                          {(booking.paymentStatus === "failed" ||
                            booking.paymentStatus === "partial" ||
                            booking.paymentStatus === "pending") &&
                            getBalanceDue(booking.amount, booking.paidAmount ?? 0) > 0 && (
                              <Link href={`/booking?bookingId=${booking.id}`}>
                                <Button variant="outline" size="sm" className="mt-2">
                                  {booking.paymentStatus === "failed"
                                    ? "Retry payment"
                                    : "Pay balance"}
                                </Button>
                              </Link>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        )}
      </section>
    </>
  );
}
