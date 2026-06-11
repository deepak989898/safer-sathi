"use client";

import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText, t } from "@/lib/i18n";
import type { Booking, BookingStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function MyBookingsClient({
  bookings,
}: {
  bookings: Booking[];
}) {
  const { locale } = useAppStore();

  const filterByStatus = (statuses: BookingStatus[]) =>
    bookings.filter((b) => statuses.includes(b.status));

  const tabs = [
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
  ];

  return (
    <>
      <PageHero
        title="My Bookings"
        subtitle="Manage and track all your travel reservations"
        image={HERO_IMAGES.myBookings}
      />

      <section className="container mx-auto px-4 py-10">
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
                          <p className="text-xs capitalize text-muted-foreground">
                            {booking.paymentStatus}
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  );
}
