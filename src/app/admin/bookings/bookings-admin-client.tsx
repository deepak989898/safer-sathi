"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Booking } from "@/types";
import { toast } from "sonner";

export default function BookingsAdminClient() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const json = await res.json();
      if (json.success) setBookings(json.data);
      else toast.error(json.error ?? "Failed to load bookings");
    } catch {
      toast.error("Failed to load bookings");
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
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
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
        <StatusBadge
          status={row.original.paymentStatus === "paid" ? "success" : "pending"}
          label={row.original.paymentStatus}
        />
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Real customer bookings from Firebase"
        adminName={user?.name ?? "Admin"}
      />
      <div className="p-6">
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
