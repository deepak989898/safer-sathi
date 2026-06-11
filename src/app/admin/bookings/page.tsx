"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { demoBookings } from "@/data/demo-data";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Booking } from "@/types";

const columns: ColumnDef<Booking>[] = [
  {
    accessorKey: "bookingNumber",
    header: "Booking ID",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.original.bookingNumber}</span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
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
    id: "aiStatus",
    header: "AI Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.aiProcessed ? "success" : "pending"}
        label={row.original.aiProcessed ? "AI Processed" : "Pending"}
      />
    ),
  },
];

export default function BookingsPage() {
  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Manage and track all customer bookings"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoBookings}
          searchKey="customerName"
          searchPlaceholder="Search bookings..."
        />
      </div>
    </>
  );
}
