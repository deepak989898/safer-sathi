"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, FileText, Mail, Share2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoBlogPosts } from "@/data/demo-data";
import { localizedText } from "@/lib/i18n";
import type { BlogPost } from "@/types";

const campaignStats = [
  { label: "Blog Posts", value: "12", icon: FileText },
  { label: "Email Campaigns", value: "5", icon: Mail },
  { label: "Social Posts", value: "28", icon: Share2 },
  { label: "Page Views (30d)", value: "45.2K", icon: Eye },
];

const columns: ColumnDef<BlogPost>[] = [
  {
    id: "title",
    header: "Content",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{localizedText(row.original.title, "en")}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {localizedText(row.original.excerpt, "en")}
        </p>
      </div>
    ),
  },
  { accessorKey: "author", header: "Author" },
  {
    id: "tags",
    header: "Tags",
    cell: ({ row }) => row.original.tags.join(", "),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.published ? "active" : "pending"}
        label={row.original.published ? "Published" : "Draft"}
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-IN"),
  },
];

export default function MarketingPage() {
  return (
    <>
      <AdminHeader
        title="Marketing"
        description="Content, campaigns, and brand outreach"
        adminName="Rajesh Kumar"
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {campaignStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="size-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Content Library</h2>
          <DataTable
            columns={columns}
            data={demoBlogPosts}
            searchKey="title"
            searchPlaceholder="Search content..."
          />
        </div>
      </div>
    </>
  );
}
