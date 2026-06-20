"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { canManageUser, ROLE_LABELS } from "@/lib/auth/constants";
import { formatCurrency } from "@/lib/i18n";
import type { User, UserRole } from "@/types";
import { toast } from "sonner";

export default function CustomersPage() {
  const { user, refreshUsers, approveUser, suspendUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");

  const actorRole = user?.role ?? "customer";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await refreshUsers();
      // Guard against malformed/null records from remote auth/user store.
      const safeUsers = (data ?? []).filter(
        (u): u is User => Boolean(u?.id && u?.name && u?.email && u?.role && u?.status)
      );
      setUsers(safeUsers);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [refreshUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApprove = async (target: User) => {
    if (!canManageUser(actorRole, target.role)) {
      toast.error("You cannot approve this user role");
      return;
    }
    try {
      await approveUser(target.id);
      toast.success("User approved successfully");
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve user");
    }
  };

  const handleSuspend = async (target: User) => {
    if (!canManageUser(actorRole, target.role)) {
      toast.error("You cannot suspend this user role");
      return;
    }
    try {
      await suspendUser(target.id);
      toast.success("User suspended");
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suspend user");
    }
  };

  const pendingUsers = users.filter(
    (u) =>
      u.status === "pending" &&
      !u.approved &&
      u.role !== "customer" &&
      canManageUser(actorRole, u.role)
  );

  const activeUsers = users.filter((u) => {
    if (u.status !== "active" || !u.approved) return false;
    if (actorRole === "super_admin") return true;
    if (actorRole === "manager") {
      return canManageUser(actorRole, u.role);
    }
    return u.role === "customer";
  });

  const filteredActiveUsers = useMemo(
    () => activeUsers.filter((u) => roleFilter === "all" || u.role === roleFilter),
    [activeUsers, roleFilter]
  );

  const filteredPendingUsers = useMemo(
    () => pendingUsers.filter((u) => roleFilter === "all" || u.role === roleFilter),
    [pendingUsers, roleFilter]
  );

  const baseColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => ROLE_LABELS[row.original.role],
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone ?? "—",
    },
  ];

  const customerColumns: ColumnDef<User>[] = [
    ...baseColumns,
    {
      id: "segment",
      header: "Segment",
      cell: ({ row }) => (
        <StatusBadge status={row.original.segment ?? "regular"} />
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        canManageUser(actorRole, row.original.role) ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSuspend(row.original)}
          >
            Suspend
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Protected</span>
        ),
    },
  ];

  const pendingColumns: ColumnDef<User>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        canManageUser(actorRole, row.original.role) ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(row.original)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSuspend(row.original)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Super Admin only
          </span>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Users & Customers"
        description={
          actorRole === "manager"
            ? "Manage sales agents, drivers, and customers"
            : "Manage customers and approve staff accounts"
        }
        adminName={user?.name ?? "Admin"}
      />
      <div className="p-4 sm:p-6">
        {actorRole === "manager" && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Managers can approve sales agents, drivers, and customers only.
            Super Admin and Support Agent accounts require Super Admin approval.
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Filter users by role to review customers, managers, sales agents, drivers, etc.
          </p>
          <div className="w-full max-w-xs">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
                <SelectItem value="super_admin">{ROLE_LABELS.super_admin}</SelectItem>
                <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                <SelectItem value="sales_agent">{ROLE_LABELS.sales_agent}</SelectItem>
                <SelectItem value="support_agent">{ROLE_LABELS.support_agent}</SelectItem>
                <SelectItem value="driver">{ROLE_LABELS.driver}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs defaultValue="customers">
          <TabsList>
            <TabsTrigger value="customers">
              Active Users ({filteredActiveUsers.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Approval ({filteredPendingUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <DataTable
                columns={customerColumns}
                data={filteredActiveUsers}
                searchKey="name"
                searchPlaceholder="Search users..."
              />
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {filteredPendingUsers.length === 0 ? (
              <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                No pending applications in your approval scope
              </p>
            ) : (
              <DataTable
                columns={pendingColumns}
                data={filteredPendingUsers}
                searchKey="name"
                searchPlaceholder="Search pending users..."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
