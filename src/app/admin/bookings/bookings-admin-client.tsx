"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bot,
  Globe,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { listBookingsFromClient } from "@/lib/bookings/booking-client";
import {
  bookingSourceDetail,
  bookingSourceLabel,
  countBookingsByFilter,
  formatBookingDateTime,
  matchesBookingAdminFilter,
  searchBookings,
  sortBookingsNewestFirst,
  type BookingAdminFilter,
} from "@/lib/bookings/admin-display";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";
import { toast } from "sonner";

const FILTER_OPTIONS: { id: BookingAdminFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payment_failed", label: "Payment failed" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function BookingsAdminClient() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadSource, setLoadSource] = useState<"server" | "client" | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingAdminFilter>("all");
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const json = await res.json();
      let items: Booking[] = [];

      if (json.success) {
        items = json.data ?? [];
      } else {
        toast.error(json.error ?? "Failed to load bookings");
      }

      if (items.length === 0) {
        const clientItems = await listBookingsFromClient(500);
        if (clientItems.length > 0) {
          items = clientItems;
          setLoadSource("client");
        } else {
          setLoadSource(null);
        }
      } else {
        setLoadSource("server");
      }

      setBookings(sortBookingsNewestFirst(items));
    } catch {
      const clientItems = await listBookingsFromClient(500);
      setBookings(sortBookingsNewestFirst(clientItems));
      setLoadSource(clientItems.length > 0 ? "client" : null);
      if (clientItems.length === 0) toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const searched = searchBookings(bookings, search);
    return searched.filter((b) => matchesBookingAdminFilter(b, statusFilter));
  }, [bookings, search, statusFilter]);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "bookingNumber",
      header: "Booking ID",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium whitespace-nowrap">
          {row.original.bookingNumber}
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-[140px] space-y-1">
          <p className="font-medium leading-tight">{row.original.customerName}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[180px]">{row.original.customerEmail || "—"}</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            {row.original.customerPhone || "—"}
          </p>
        </div>
      ),
    },
    {
      id: "source",
      header: "Booked via",
      cell: ({ row }) => {
        const ai = row.original.aiProcessed;
        return (
          <div className="min-w-[120px] space-y-1">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[11px] font-medium",
                ai
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              )}
            >
              {ai ? <Bot className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {bookingSourceLabel(row.original)}
            </Badge>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {bookingSourceDetail(row.original)}
            </p>
          </div>
        );
      },
    },
    {
      id: "service",
      header: "Service",
      cell: ({ row }) => (
        <div className="min-w-[120px]">
          <p className="text-sm leading-snug">{localizedText(row.original.serviceName, "en")}</p>
          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
            {row.original.serviceType.replace(/_/g, " ")}
          </p>
        </div>
      ),
    },
    {
      id: "bookedAt",
      header: "Booked on",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">
          {formatBookingDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Travel date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {new Date(row.original.startDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Total",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      id: "paid",
      header: "Paid",
      cell: ({ row }) => formatCurrency(row.original.paidAmount ?? 0),
    },
    {
      id: "balance",
      header: "Balance",
      cell: ({ row }) =>
        formatCurrency(getBalanceDue(row.original.amount, row.original.paidAmount ?? 0)),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => (
        <StatusBadge status={row.original.paymentStatus} label={row.original.paymentStatus} />
      ),
    },
    {
      id: "failure",
      header: "Last issue",
      cell: ({ row }) => (
        <span
          className="block max-w-[200px] truncate text-xs text-muted-foreground"
          title={row.original.paymentFailureReason ?? undefined}
        >
          {row.original.paymentFailureReason ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Bookings"
        description="All bookings — AI assistant & website, with contact details, payment status, and filters"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const count =
                opt.id === "all"
                  ? bookings.length
                  : countBookingsByFilter(bookings, opt.id);
              const active = statusFilter === opt.id;
              return (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setStatusFilter(opt.id)}
                >
                  {opt.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1.5 h-5 min-w-5 px-1.5 text-[10px]",
                      active && "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadBookings()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loadSource === "client" && bookings.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Loaded via staff Firebase session (includes guest mobile bookings)
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {bookings.length === 0
              ? "No bookings yet. New bookings from the website will appear here."
              : "No bookings match this filter or search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filteredBookings}
              pageSize={15}
            />
          </div>
        )}
      </div>
    </>
  );
}
