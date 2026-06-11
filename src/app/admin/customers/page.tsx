"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { demoUsers } from "@/data/demo-data";
import { formatCurrency } from "@/lib/i18n";
import type { User } from "@/types";

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone ?? "—",
  },
  {
    id: "segment",
    header: "Segment",
    cell: ({ row }) =>
      row.original.segment ? (
        <StatusBadge status={row.original.segment} />
      ) : (
        <StatusBadge status="regular" />
      ),
  },
  {
    accessorKey: "totalBookings",
    header: "Bookings",
    cell: ({ row }) => row.original.totalBookings ?? 0,
  },
  {
    accessorKey: "totalSpent",
    header: "Total Spent",
    cell: ({ row }) =>
      row.original.totalSpent ? formatCurrency(row.original.totalSpent) : "—",
  },
  {
    accessorKey: "locale",
    header: "Locale",
    cell: ({ row }) => row.original.locale.toUpperCase(),
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-IN"),
  },
];

export default function CustomersPage() {
  return (
    <>
      <AdminHeader
        title="Customers"
        description="Customer relationship management"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoUsers}
          searchKey="name"
          searchPlaceholder="Search customers..."
        />
      </div>
    </>
  );
}
