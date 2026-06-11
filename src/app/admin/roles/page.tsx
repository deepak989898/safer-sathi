"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";

interface RoleRow {
  id: string;
  name: string;
  role: UserRole;
  users: number;
  permissions: string[];
}

const demoRoles: RoleRow[] = [
  {
    id: "r1",
    name: "Super Admin",
    role: "super_admin",
    users: 2,
    permissions: ["Full Access", "User Management", "Settings", "Billing", "AI Agents"],
  },
  {
    id: "r2",
    name: "Manager",
    role: "manager",
    users: 5,
    permissions: ["Bookings", "Vehicles", "Packages", "Analytics", "Reports"],
  },
  {
    id: "r3",
    name: "Sales Agent",
    role: "sales_agent",
    users: 12,
    permissions: ["Bookings", "Packages", "Customers", "Quotes"],
  },
  {
    id: "r4",
    name: "Support Agent",
    role: "support_agent",
    users: 8,
    permissions: ["Support Tickets", "Customers", "Bookings (Read)"],
  },
  {
    id: "r5",
    name: "Driver",
    role: "driver",
    users: 24,
    permissions: ["Assigned Trips", "Vehicle Status", "Navigation"],
  },
];

const columns: ColumnDef<RoleRow>[] = [
  { accessorKey: "name", header: "Role" },
  {
    accessorKey: "role",
    header: "Role Key",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.role}
      </span>
    ),
  },
  { accessorKey: "users", header: "Users" },
  {
    id: "permissions",
    header: "Permissions",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.permissions.map((perm) => (
          <Badge key={perm} variant="secondary" className="text-xs">
            {perm}
          </Badge>
        ))}
      </div>
    ),
  },
];

export default function RolesPage() {
  return (
    <>
      <AdminHeader
        title="Roles"
        description="Role-based access control and permissions"
        adminName="Rajesh Kumar"
      />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={demoRoles}
          searchKey="name"
          searchPlaceholder="Search roles..."
        />
      </div>
    </>
  );
}
