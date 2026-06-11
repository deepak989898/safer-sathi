"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { demoHotels } from "@/data/demo-data";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Hotel } from "@/types";

const columns: ColumnDef<Hotel>[] = [
  {
    id: "name",
    header: "Hotel",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{localizedText(row.original.name, "en")}</p>
        <p className="text-xs text-muted-foreground">{row.original.location}</p>
      </div>
    ),
  },
  { accessorKey: "city", header: "City" },
  {
    accessorKey: "starRating",
    header: "Stars",
    cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: row.original.starRating }).map((_, i) => (
          <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
    ),
  },
  {
    accessorKey: "priceFrom",
    header: "From",
    cell: ({ row }) => formatCurrency(row.original.priceFrom),
  },
  {
    id: "amenities",
    header: "Amenities",
    cell: ({ row }) => row.original.amenities.slice(0, 3).join(", "),
  },
  {
    id: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <span>
        {row.original.rating}{" "}
        <span className="text-muted-foreground">({row.original.reviewCount})</span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.available ? "active" : "paused"}
        label={row.original.available ? "Available" : "Unavailable"}
      />
    ),
  },
];

export default function HotelsPage() {
  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage hotel listings and availability"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoHotels}
          searchKey="name"
          searchPlaceholder="Search hotels..."
        />
      </div>
    </>
  );
}
