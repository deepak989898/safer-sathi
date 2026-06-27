"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Car,
  Download,
  Gift,
  Hotel,
  Loader2,
  Luggage,
  MapPin,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import { AccountDashboardHeader } from "@/components/customer/account-dashboard-header";
import { ChangePasswordCard } from "@/components/customer/change-password-card";
import { CustomerProfileCard } from "@/components/customer/customer-profile-card";
import { CustomerRewardsCard } from "@/components/customer/customer-rewards-card";
import { formatIsoDateForDisplay } from "@/components/customer/booking-date-input";
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
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const statusAccent: Record<BookingStatus, string> = {
  pending: "border-l-amber-500",
  confirmed: "border-l-emerald-500",
  upcoming: "border-l-sky-500",
  completed: "border-l-muted-foreground/40",
  cancelled: "border-l-red-500",
  refunded: "border-l-purple-500",
};

function formatBookingDates(booking: Booking): string {
  const start = formatIsoDateForDisplay(booking.startDate);
  const end = booking.endDate ? formatIsoDateForDisplay(booking.endDate) : "";
  return end ? `${start} → ${end}` : start;
}

const QUICK_LINKS = [
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/vehicles", label: "Vehicles", icon: Car },
] as const;

export default function MyBookingsClient() {
  const { user } = useAuth();
  const locale = "en" as const;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bookingsRes, rewardsRes] = await Promise.all([
        customerApiFetch("/api/bookings"),
        customerApiFetch("/api/customer/rewards"),
      ]);
      const bookingsJson = await bookingsRes.json();
      const rewardsJson = await rewardsRes.json();

      if (bookingsJson.success) {
        const items = (bookingsJson.data ?? []) as Booking[];
        setBookings(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      if (rewardsJson.success) {
        setRewardPoints(Number(rewardsJson.data?.rewardPoints ?? 0));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const upcomingCount = useMemo(
    () =>
      bookings.filter((b) =>
        ["upcoming", "confirmed", "pending"].includes(b.status)
      ).length,
    [bookings]
  );

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
    <Card
      key={booking.id}
      className={cn(
        "overflow-hidden border-l-4 shadow-sm transition-shadow hover:shadow-md",
        statusAccent[booking.status]
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:justify-start">
              <p className="text-base font-semibold leading-snug text-[#0c2444] dark:text-foreground sm:text-lg">
                {localizedText(booking.serviceName, locale)}
              </p>
              <Badge
                className={cn("shrink-0 capitalize", statusColors[booking.status])}
                variant="secondary"
              >
                {t(locale, "common", booking.status)}
              </Badge>
            </div>

            <p className="font-mono text-xs text-muted-foreground sm:text-sm">
              {booking.bookingNumber}
            </p>

            <div className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatBookingDates(booking)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {booking.guests} guests
              </span>
              {formatVehicleRoute(booking) ? (
                <span className="flex items-center gap-1.5 sm:col-span-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formatVehicleRoute(booking)}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 capitalize">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {booking.serviceType.replace("_", " ")}
                </span>
              )}
            </div>

            {(booking.rewardPointsEarned ?? 0) > 0 && (
              <p className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Gift className="h-3 w-3" />
                +{booking.rewardPointsEarned} points earned
              </p>
            )}
          </div>

          <div className="flex flex-row items-end justify-between gap-3 border-t pt-3 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
            <div className="text-left lg:text-right">
              <p className="text-lg font-bold text-primary sm:text-xl">
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
                  ` · ${formatCurrency(booking.paidAmount ?? 0, locale)} paid`}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {(booking.paymentStatus === "paid" ||
                booking.paymentStatus === "partial" ||
                booking.status === "confirmed") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
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
                    <Button variant="default" size="sm" className="h-8">
                      {booking.paymentStatus === "failed" ? "Retry" : "Pay"}
                    </Button>
                  </Link>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <AccountDashboardHeader
        name={user.name}
        email={user.email}
        bookingCount={bookings.length}
        upcomingCount={upcomingCount}
        rewardPoints={rewardPoints}
        loading={loading}
      />

      <div className="container mx-auto px-4 py-5 sm:py-8">
        <Tabs defaultValue="bookings" className="space-y-5 sm:space-y-6">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-background p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="bookings" className="shrink-0 rounded-lg px-4 py-2 text-sm">
              My bookings
            </TabsTrigger>
            <TabsTrigger value="rewards" className="shrink-0 rounded-lg px-4 py-2 text-sm">
              Rewards
            </TabsTrigger>
            <TabsTrigger value="profile" className="shrink-0 rounded-lg px-4 py-2 text-sm">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-0 space-y-5">
            <Card className="overflow-hidden border-primary/15 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0c2444] dark:text-foreground">
                        Book again & earn rewards
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Every paid trip earns points. Redeem on your next booking.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className="shrink-0">
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
                          <Icon className="h-4 w-4" />
                          {label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm">Loading your bookings...</p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  {bookingTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:px-4 sm:text-sm"
                    >
                      {tab.label}
                      <Badge
                        variant="secondary"
                        className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] data-[state=active]:bg-primary-foreground/20"
                      >
                        {tab.items.length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {bookingTabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value} className="mt-0">
                    {tab.items.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center py-14 text-center">
                          <Luggage className="mb-3 h-10 w-10 text-muted-foreground/50" />
                          <p className="font-medium text-[#0c2444] dark:text-foreground">
                            No bookings here yet
                          </p>
                          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            Explore packages, hotels, or vehicles to plan your next trip.
                          </p>
                          <Link href="/packages" className="mt-5">
                            <Button>Explore packages</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {tab.items.map(renderBookingCard)}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="mt-0">
            <CustomerRewardsCard className="mb-0 shadow-sm" />
          </TabsContent>

          <TabsContent value="profile" className="mt-0 space-y-4 sm:space-y-5">
            <CustomerProfileCard className="mb-0 shadow-sm" />
            <ChangePasswordCard className="mb-0 shadow-sm" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
