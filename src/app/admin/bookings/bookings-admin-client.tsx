"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  X,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { RecoverPaidBookingCard } from "@/components/admin/recover-paid-booking-card";
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
import { adminApiFetch } from "@/lib/admin/api-client";
import { listBookingsFromClient } from "@/lib/bookings/booking-client";
import {
  bookingSourceDetail,
  bookingSourceLabel,
  countBookingsByFilter,
  formatBookingDateTime,
  formatVehicleRoute,
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

function mergeBookings(server: Booking[], client: Booking[]): Booking[] {
  const map = new Map<string, Booking>();
  for (const booking of client) map.set(booking.id, booking);
  for (const booking of server) {
    const existing = map.get(booking.id);
    if (!existing) {
      map.set(booking.id, booking);
      continue;
    }
    const serverTime = booking.updatedAt ?? booking.createdAt;
    const clientTime = existing.updatedAt ?? existing.createdAt;
    map.set(booking.id, serverTime >= clientTime ? booking : existing);
  }
  return Array.from(map.values());
}

export default function BookingsAdminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadSource, setLoadSource] = useState<"server" | "client" | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingAdminFilter>("all");
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const clearSearch = useCallback(() => {
    setSearch("");
    router.replace("/admin/bookings");
  }, [router]);

  const updateBookingStatus = useCallback(
    async (
      booking: Booking,
      updates: { status?: Booking["status"]; paymentStatus?: Booking["paymentStatus"] },
      sendConfirmation = false
    ) => {
      if (!user?.role) {
        toast.error("You must be signed in as staff");
        return;
      }
      setUpdatingBookingId(booking.id);
      try {
        const res = await adminApiFetch(`/api/admin/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updates,
            sendConfirmation,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? "Failed to update booking");
        }
        const updated = json.data as Booking;
        setBookings((prev) =>
          sortBookingsNewestFirst(
            prev.map((item) => (item.id === updated.id ? updated : item))
          )
        );
        toast.success(`Booking ${booking.bookingNumber} updated`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update booking");
      } finally {
        setUpdatingBookingId(null);
      }
    },
    [user?.role]
  );

  const sendInvoice = useCallback(
    async (booking: Booking, channel: "email" | "whatsapp" | "both") => {
      if (!user?.role) {
        toast.error("You must be signed in as staff");
        return;
      }
      setSendingInvoiceId(booking.id);
      try {
        const res = await adminApiFetch(`/api/admin/bookings/${booking.id}/send-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel }),
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
        const res = await adminApiFetch(`/api/bookings/${booking.id}/invoice`);
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
      const res = await adminApiFetch("/api/admin/bookings");
      const json = await res.json();
      let items: Booking[] = [];

      if (json.success) {
        items = json.data ?? [];
      } else {
        toast.error(json.error ?? "Failed to load bookings");
      }

      const clientItems = await listBookingsFromClient(500);
      items = mergeBookings(items, clientItems);

      if (json.success && (json.data?.length ?? 0) > 0) {
        setLoadSource("server");
      } else if (clientItems.length > 0) {
        setLoadSource("client");
      } else {
        setLoadSource(null);
      }

      setBookings(sortBookingsNewestFirst(items));
    } catch {
      const clientItems = await listBookingsFromClient(500);
      setBookings(sortBookingsNewestFirst(clientItems));
      setLoadSource(clientItems.length > 0 ? "client" : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) {
      setSearch(query);
      setFiltersExpanded(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const searched = searchBookings(bookings, search);
    return searched.filter((b) => matchesBookingAdminFilter(b, statusFilter));
  }, [bookings, search, statusFilter]);

  const isFilteredView = search.trim().length > 0 || statusFilter !== "all";

  const groupedBookings = useMemo(
    () => groupBookingsByBookedDate(filteredBookings),
    [filteredBookings]
  );

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
      cell: ({ row }) => {
        const route = formatVehicleRoute(row.original);
        return (
          <div className="min-w-[120px]">
            <p className="text-sm leading-snug">{localizedText(row.original.serviceName, "en")}</p>
            <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
              {row.original.serviceType.replace(/_/g, " ")}
              {row.original.bookingMode
                ? ` · ${row.original.bookingMode === "day" ? "Per day" : "Per km"}`
                : ""}
            </p>
            {route && (
              <p className="mt-1 text-[11px] leading-snug text-primary">{route}</p>
            )}
          </div>
        );
      },
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
      header: "Actions",
      cell: ({ row }) => {
        const booking = row.original;
        const busy = sendingInvoiceId === booking.id || updatingBookingId === booking.id;
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
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {booking.status !== "confirmed" && (
                <DropdownMenuItem
                  onClick={() =>
                    void updateBookingStatus(booking, { status: "confirmed" }, true)
                  }
                >
                  Confirm booking
                </DropdownMenuItem>
              )}
              {booking.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() =>
                    void updateBookingStatus(booking, { status: "cancelled" })
                  }
                >
                  Mark cancelled
                </DropdownMenuItem>
              )}
              {booking.paymentStatus !== "paid" && booking.status === "confirmed" && (
                <DropdownMenuItem
                  onClick={() =>
                    void updateBookingStatus(booking, { paymentStatus: "paid" })
                  }
                >
                  Mark payment paid
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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
        <RecoverPaidBookingCard
          onRecovered={(booking) => {
            setBookings((prev) =>
              sortBookingsNewestFirst([
                booking,
                ...prev.filter((item) => item.id !== booking.id),
              ])
            );
            setFiltersExpanded(true);
            toast.success(`Booking ${booking.bookingNumber} recovered.`);
          }}
        />

        {isFilteredView && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/20">
            <p className="text-[#0c2444] dark:text-sky-100">
              Showing <strong>{filteredBookings.length}</strong> of{" "}
              <strong>{bookings.length}</strong> bookings
              {search.trim() ? (
                <>
                  {" "}
                  matching &quot;{search.trim()}&quot;
                </>
              ) : null}
              {statusFilter !== "all" ? (
                <>
                  {" "}
                  in{" "}
                  <strong>
                    {FILTER_OPTIONS.find((option) => option.id === statusFilter)?.label}
                  </strong>
                </>
              ) : null}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              {search.trim() ? (
                <Button type="button" size="sm" variant="outline" onClick={clearSearch}>
                  Clear search
                </Button>
              ) : null}
              {statusFilter !== "all" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusFilter("all")}
                >
                  Show all statuses
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:opacity-80"
            >
              {filtersExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-[#0c2444]">Filters & search</p>
                <p className="text-xs text-muted-foreground">
                  {statusFilter === "all"
                    ? "All bookings"
                    : FILTER_OPTIONS.find((f) => f.id === statusFilter)?.label}
                  {search.trim() ? ` · "${search.trim()}"` : ""}
                </p>
              </div>
            </button>
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

          {filtersExpanded && (
            <div className="space-y-4 border-t px-4 py-4">
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

              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone, booking ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search.trim() ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {loadSource === "client" && bookings.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Merged with staff Firebase session data (includes guest mobile bookings)
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
