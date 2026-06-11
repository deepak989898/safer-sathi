"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { demoPackages } from "@/data/demo-data";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { TourPackage } from "@/types";

const columns: ColumnDef<TourPackage>[] = [
  {
    id: "title",
    header: "Package",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{localizedText(row.original.title, "en")}</p>
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => localizedText(row.original.durationLabel, "en"),
  },
  {
    id: "cities",
    header: "Cities",
    cell: ({ row }) => row.original.cities.join(", "),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    id: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        <span>{row.original.rating}</span>
        <span className="text-muted-foreground">({row.original.reviewCount})</span>
      </div>
    ),
  },
  {
    id: "featured",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.featured ? "active" : "default"}
        label={row.original.featured ? "Featured" : "Standard"}
      />
    ),
  },
];

export default function PackagesPage() {
  return (
    <>
      <AdminHeader
        title="Packages"
        description="Manage tour packages and itineraries"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoPackages}
          searchKey="title"
          searchPlaceholder="Search packages..."
        />
      </div>
    </>
  );
}
