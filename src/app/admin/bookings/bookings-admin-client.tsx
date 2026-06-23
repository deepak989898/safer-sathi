"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Globe,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { listBookingsFromClient } from "@/lib/bookings/booking-client";
import {
  bookingSourceDetail,
  bookingSourceLabel,
  countBookingsByFilter,
  formatBookingDateTime,
  groupBookingsByBookedDate,
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
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  const sendInvoice = useCallback(
    async (booking: Booking, channel: "email" | "whatsapp" | "both") => {
      if (!user?.role) {
        toast.error("You must be signed in as staff");
        return;
      }
      setSendingInvoiceId(booking.id);
      try {
        const res = await fetch(`/api/admin/bookings/${booking.id}/send-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorRole: user.role, channel }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Failed to send invoice");
        }
        if (channel === "email") toast.success(`Invoice emailed to ${booking.customerEmail}`);
        else if (channel === "whatsapp") toast.success(`Invoice sent on WhatsApp to ${booking.customerPhone}`);
        else toast.success("Invoice sent via email and WhatsApp");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send invoice");
      } finally {
        setSendingInvoiceId(null);
      }
    },
    [user?.role]
  );

  const downloadInvoice = useCallback(
    async (booking: Booking) => {
      if (!user?.role) {
        toast.error("You must be signed in as staff");
        return;
      }
      try {
        const res = await fetch(
          `/api/bookings/${booking.id}/invoice?actorRole=${encodeURIComponent(user.role)}`
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Failed to download invoice");
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
        toast.error(error instanceof Error ? error.message : "Could not download invoice");
      }
    },
    [user?.role]
  );

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

  const groupedBookings = useMemo(
    () => groupBookingsByBookedDate(filteredBookings),
    [filteredBookings]
  );

  const groupDateKeys = useMemo(
    () => groupedBookings.map((group) => group.dateKey).join("|"),
    [groupedBookings]
  );

  useEffect(() => {
    if (groupedBookings.length === 0) {
      setExpandedDates(new Set());
      return;
    }

    if (search.trim()) {
      setExpandedDates(new Set(groupedBookings.map((group) => group.dateKey)));
      return;
    }

    setExpandedDates(new Set([groupedBookings[0].dateKey]));
  }, [groupDateKeys, search, groupedBookings]);

  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

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
    {
      id: "actions",
      header: "Invoice",
      cell: ({ row }) => {
        const booking = row.original;
        const busy = sendingInvoiceId === booking.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={busy}
              render={<Button variant="outline" size="sm" className="h-8 gap-1" />}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="h-3.5 w-3.5" />
              )}
              Send
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                disabled={!booking.customerEmail || busy}
                onClick={() => void sendInvoice(booking, "email")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!booking.customerPhone || busy}
                onClick={() => void sendInvoice(booking, "whatsapp")}
              >
                <Phone className="mr-2 h-4 w-4" />
                WhatsApp invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!booking.customerEmail || !booking.customerPhone || busy}
                onClick={() => void sendInvoice(booking, "both")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email + WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void downloadInvoice(booking)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
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
          <div className="space-y-3">
            {groupedBookings.map((group) => {
              const expanded = expandedDates.has(group.dateKey);
              return (
                <div
                  key={group.dateKey}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => toggleDateGroup(group.dateKey)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-[#0c2444]">{group.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.bookings.length} booking
                          {group.bookings.length === 1 ? "" : "s"} · newest first
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {group.bookings.length}
                    </Badge>
                  </button>

                  {expanded && (
                    <div className="border-t px-2 pb-2 pt-1">
                      <DataTable
                        columns={columns}
                        data={group.bookings}
                        hidePagination
                        nested
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
