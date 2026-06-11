"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import type { SupportTicket } from "@/types";

const demoTickets: SupportTicket[] = [
  {
    id: "t1",
    userId: "u1",
    subject: "Booking modification request",
    message: "Need to change travel dates for Golden Triangle Tour",
    status: "open",
    priority: "high",
    aiHandled: false,
    createdAt: "2025-06-10T08:00:00Z",
    updatedAt: "2025-06-10T08:00:00Z",
  },
  {
    id: "t2",
    userId: "u2",
    subject: "Payment refund inquiry",
    message: "Partial payment refund for cancelled vehicle booking",
    status: "in_progress",
    priority: "medium",
    aiHandled: true,
    confidence: 0.92,
    createdAt: "2025-06-09T14:30:00Z",
    updatedAt: "2025-06-10T10:00:00Z",
  },
  {
    id: "t3",
    userId: "u1",
    subject: "Hotel room upgrade",
    message: "Requesting deluxe room upgrade at Taj Palace",
    status: "resolved",
    priority: "low",
    aiHandled: true,
    confidence: 0.88,
    createdAt: "2025-06-08T11:00:00Z",
    updatedAt: "2025-06-09T16:00:00Z",
  },
  {
    id: "t4",
    userId: "u2",
    subject: "Driver contact details",
    message: "Need driver phone number for upcoming trip",
    status: "closed",
    priority: "low",
    aiHandled: true,
    confidence: 0.95,
    createdAt: "2025-06-07T09:00:00Z",
    updatedAt: "2025-06-07T12:00:00Z",
  },
];

const columns: ColumnDef<SupportTicket>[] = [
  {
    accessorKey: "id",
    header: "Ticket ID",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.id.toUpperCase()}</span>
    ),
  },
  { accessorKey: "subject", header: "Subject" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <StatusBadge status={row.original.priority} />,
  },
  {
    id: "ai",
    header: "AI Handled",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.aiHandled ? "success" : "pending"}
        label={
          row.original.aiHandled
            ? `AI (${Math.round((row.original.confidence ?? 0) * 100)}%)`
            : "Human"
        }
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

export default function SupportPage() {
  return (
    <>
      <AdminHeader
        title="Support"
        description="Customer support tickets and escalations"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoTickets}
          searchKey="subject"
          searchPlaceholder="Search tickets..."
        />
      </div>
    </>
  );
}
