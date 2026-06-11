"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Workflow } from "@/types";

const demoWorkflows: Workflow[] = [
  {
    id: "wf1",
    name: "Booking Confirmation",
    trigger: "New booking created",
    steps: [
      { id: "s1", action: "Send confirmation email", status: "completed" },
      { id: "s2", action: "Generate invoice", status: "completed" },
      { id: "s3", action: "Notify driver", status: "completed" },
    ],
    status: "active",
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "wf2",
    name: "Abandoned Cart Recovery",
    trigger: "Booking abandoned > 1 hour",
    steps: [
      { id: "s1", action: "Send reminder WhatsApp", status: "completed" },
      { id: "s2", action: "Apply discount offer", status: "completed" },
      { id: "s3", action: "Follow-up email", status: "pending" },
    ],
    status: "active",
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "wf3",
    name: "Support Ticket Escalation",
    trigger: "Ticket unresolved > 24 hours",
    steps: [
      { id: "s1", action: "AI re-attempt resolution", status: "completed" },
      { id: "s2", action: "Assign to human agent", status: "completed" },
      { id: "s3", action: "Notify manager", status: "completed" },
    ],
    status: "active",
    createdAt: "2025-03-10T00:00:00Z",
  },
  {
    id: "wf4",
    name: "Post-Trip Review Request",
    trigger: "Booking completed",
    steps: [
      { id: "s1", action: "Send review request", status: "completed" },
      { id: "s2", action: "Collect feedback", status: "pending" },
    ],
    status: "paused",
    createdAt: "2025-04-01T00:00:00Z",
  },
];

const columns: ColumnDef<Workflow>[] = [
  { accessorKey: "name", header: "Workflow" },
  { accessorKey: "trigger", header: "Trigger" },
  {
    id: "steps",
    header: "Steps",
    cell: ({ row }) => (
      <span>
        {row.original.steps.filter((s) => s.status === "completed").length}/
        {row.original.steps.length} completed
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-IN"),
  },
];

export default function WorkflowsPage() {
  return (
    <>
      <AdminHeader
        title="Workflows"
        description="Automation workflows and triggers"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoWorkflows}
          searchKey="name"
          searchPlaceholder="Search workflows..."
        />
      </div>
    </>
  );
}
