"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { canApproveUsers, ROLE_LABELS } from "@/lib/auth/constants";
import { formatCurrency } from "@/lib/i18n";
import type { User } from "@/types";
import { toast } from "sonner";

export default function CustomersPage() {
  const { user, refreshUsers, approveUser, suspendUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await refreshUsers();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [refreshUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApprove = async (userId: string) => {
    try {
      await approveUser(userId);
      toast.success("User approved successfully");
      loadUsers();
    } catch {
      toast.error("Failed to approve user");
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      await suspendUser(userId);
      toast.success("User suspended");
      loadUsers();
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const pendingUsers = users.filter((u) => u.status === "pending" || !u.approved);
  const activeUsers = users.filter((u) => u.status === "active" && u.approved);

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
  ];

  const pendingColumns: ColumnDef<User>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        canApproveUsers(user?.role ?? "customer") ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(row.original.id)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSuspend(row.original.id)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No permission</span>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Users & Customers"
        description="Manage customers and approve staff accounts"
        adminName={user?.name ?? "Admin"}
      />
      <div className="p-4 sm:p-6">
        <Tabs defaultValue="customers">
          <TabsList>
            <TabsTrigger value="customers">
              Active Users ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Approval ({pendingUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <DataTable
                columns={customerColumns}
                data={activeUsers}
                searchKey="name"
                searchPlaceholder="Search users..."
              />
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pendingUsers.length === 0 ? (
              <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                No pending staff applications
              </p>
            ) : (
              <DataTable
                columns={pendingColumns}
                data={pendingUsers}
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
