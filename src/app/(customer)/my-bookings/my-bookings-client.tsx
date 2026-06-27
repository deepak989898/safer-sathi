"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  Hotel,
  Loader2,
  MapPin,
  Package,
  Car,
  Users,
  Gift,
} from "lucide-react";
import { ChangePasswordCard } from "@/components/customer/change-password-card";
import { CustomerProfileCard } from "@/components/customer/customer-profile-card";
import { CustomerRewardsCard } from "@/components/customer/customer-rewards-card";
import { formatIsoDateForDisplay } from "@/components/customer/booking-date-input";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { customerApiFetch } from "@/lib/admin/api-client";
import { formatVehicleRoute } from "@/lib/bookings/admin-display";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function formatBookingDates(booking: Booking): string {
  const start = formatIsoDateForDisplay(booking.startDate);
  const end = booking.endDate ? formatIsoDateForDisplay(booking.endDate) : "";
  return end ? `${start} → ${end}` : start;
}

export default function MyBookingsClient() {
  const { user } = useAuth();
  const locale = "en" as const;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await customerApiFetch("/api/bookings");
      const json = await res.json();
      if (json.success) {
        const items = (json.data ?? []) as Booking[];
        setBookings(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const downloadInvoice = async (booking: Booking) => {
    if (booking.paymentStatus === "pending" && booking.paidAmount === 0) {
      toast.error("Invoice is available after payment is received.");
      return;
    }

    setDownloadingId(booking.id);
    try {
      const res = await customerApiFetch(`/api/bookings/${booking.id}/invoice`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Could not download invoice");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SafarSathi-Invoice-${booking.bookingNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const filterByStatus = (statuses: BookingStatus[]) =>
    bookings.filter((b) => statuses.includes(b.status));

  const bookingTabs = useMemo(
    () => [
      { value: "all", label: "All", items: bookings },
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
    ],
    [bookings, locale]
  );

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id}>
      <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{localizedText(booking.serviceName, locale)}</p>
            <Badge
              className={cn("capitalize", statusColors[booking.status])}
              variant="secondary"
            >
              {t(locale, "common", booking.status)}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{booking.bookingNumber}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatBookingDates(booking)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {booking.guests} guests
            </span>
            {formatVehicleRoute(booking) ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {formatVehicleRoute(booking)}
              </span>
            ) : (
              <span className="flex items-center gap-1 capitalize">
                <MapPin className="h-3.5 w-3.5" />
                {booking.serviceType.replace("_", " ")}
              </span>
            )}
          </div>
          {booking.rewardPointsEarned ? (
            <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <Gift className="h-3.5 w-3.5" />
              +{booking.rewardPointsEarned} reward points earned
            </p>
          ) : null}
          {booking.rewardDiscount ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Reward discount applied: {formatCurrency(booking.rewardDiscount)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(booking.amount, locale)}
            </p>
            {booking.originalAmount && booking.originalAmount > booking.amount ? (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(booking.originalAmount, locale)}
              </p>
            ) : null}
            <p className={cn("text-xs capitalize", paymentColors[booking.paymentStatus])}>
              {booking.paymentStatus}
              {(booking.paidAmount ?? 0) > 0 &&
                ` · paid ${formatCurrency(booking.paidAmount ?? 0, locale)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(booking.paymentStatus === "paid" ||
              booking.paymentStatus === "partial" ||
              booking.status === "confirmed") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingId === booking.id}
                onClick={() => void downloadInvoice(booking)}
              >
                {downloadingId === booking.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Invoice
              </Button>
            )}
            {(booking.paymentStatus === "failed" ||
              booking.paymentStatus === "partial" ||
              booking.paymentStatus === "pending") &&
              getBalanceDue(booking.amount, booking.paidAmount ?? 0) > 0 && (
                <Link href={`/booking?bookingId=${booking.id}`}>
                  <Button variant="outline" size="sm">
                    {booking.paymentStatus === "failed" ? "Retry payment" : "Pay balance"}
                  </Button>
                </Link>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHero
        title="My Account"
        subtitle="Bookings, invoices, profile, and Safar Sathi Rewards"
        image={HERO_IMAGES.myBookings}
      />

      <section className="container mx-auto px-4 py-10">
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="bookings">My bookings</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#0c2444]">Book again & save</p>
                  <p className="text-sm text-muted-foreground">
                    Signed-in customers earn reward points and can redeem them on the next
                    booking.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/packages">
                    <Button size="sm" variant="outline">
                      <Package className="mr-1.5 h-4 w-4" />
                      Packages
                    </Button>
                  </Link>
                  <Link href="/hotels">
                    <Button size="sm" variant="outline">
                      <Hotel className="mr-1.5 h-4 w-4" />
                      Hotels
                    </Button>
                  </Link>
                  <Link href="/vehicles">
                    <Button size="sm" variant="outline">
                      <Car className="mr-1.5 h-4 w-4" />
                      Vehicles
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Loading your bookings...
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-6">
                  {bookingTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                      <Badge variant="secondary" className="ml-1.5 text-xs">
                        {tab.items.length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {bookingTabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value}>
                    {tab.items.length === 0 ? (
                      <div className="py-20 text-center">
                        <p className="text-muted-foreground">No bookings found.</p>
                        <Link href="/packages">
                          <Button className="mt-4">Explore Packages</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">{tab.items.map(renderBookingCard)}</div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="rewards">
            <CustomerRewardsCard />
          </TabsContent>

          <TabsContent value="profile" className="space-y-0">
            <CustomerProfileCard />
            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
