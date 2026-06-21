"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAuth } from "@/contexts/auth-context";
import { listBookingsFromClient } from "@/lib/bookings/booking-client";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Booking } from "@/types";
import { toast } from "sonner";

export default function BookingsAdminClient() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadSource, setLoadSource] = useState<"server" | "client" | null>(null);

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

      setBookings(items);
    } catch {
      const clientItems = await listBookingsFromClient(500);
      setBookings(clientItems);
      setLoadSource(clientItems.length > 0 ? "client" : null);
      if (clientItems.length === 0) toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "bookingNumber",
      header: "Booking ID",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.bookingNumber}</span>
      ),
    },
    { accessorKey: "customerName", header: "Customer" },
    {
      id: "service",
      header: "Service",
      cell: ({ row }) => localizedText(row.original.serviceName, "en"),
    },
    {
      accessorKey: "startDate",
      header: "Date",
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString("en-IN"),
    },
    {
      accessorKey: "amount",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.amount),
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
        <span className="max-w-[220px] truncate text-xs text-muted-foreground">
          {row.original.paymentFailureReason ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Bookings"
        description="All bookings including failed payments, partial advances, and confirmed trips"
        adminName={user?.name ?? "Admin"}
      />
      <div className="p-6">
        {loadSource === "client" && bookings.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            Loaded via staff Firebase session (includes guest mobile bookings)
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No bookings yet. New bookings from the website will appear here.
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={bookings}
            searchKey="customerName"
            searchPlaceholder="Search bookings..."
          />
        )}
      </div>
    </>
  );
}
