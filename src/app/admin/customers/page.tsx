"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { CustomerProfileDialog } from "@/components/admin/customer-profile-dialog";
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
import { adminApiFetch } from "@/lib/admin/api-client";
import { canManageUser, ROLE_LABELS } from "@/lib/auth/constants";
import type { CustomerListItem } from "@/lib/admin/customer-insights";
import { formatCurrency } from "@/lib/i18n";
import type { User, UserRole } from "@/types";
import { toast } from "sonner";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function CustomersPage() {
  const { user, refreshUsers, approveUser, suspendUser } = useAuth();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [pendingStaff, setPendingStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("customer");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const actorRole = user?.role ?? "customer";

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const roleQuery = roleFilter === "all" ? "" : `?role=${roleFilter}`;
      const [customersRes, staffRes] = await Promise.all([
        adminApiFetch(`/api/admin/customers${roleQuery}`),
        refreshUsers(),
      ]);

      const customersJson = await customersRes.json();
      if (customersJson.success) {
        setCustomers(customersJson.data.customers ?? []);
      } else {
        throw new Error(customersJson.error);
      }

      const safeUsers = (staffRes ?? []).filter(
        (u): u is User => Boolean(u?.id && u?.name && u?.email && u?.role && u?.status)
      );
      setPendingStaff(
        safeUsers.filter(
          (u) =>
            u.status === "pending" &&
            !u.approved &&
            u.role !== "customer" &&
            canManageUser(actorRole, u.role)
        )
      );
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, refreshUsers, actorRole]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const handleApprove = async (target: User) => {
    if (!canManageUser(actorRole, target.role)) {
      toast.error("You cannot approve this user role");
      return;
    }
    try {
      await approveUser(target.id);
      toast.success("User approved successfully");
      void loadCustomers();
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
      void loadCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suspend user");
    }
  };

  const openProfile = (target: CustomerListItem) => {
    setProfileUserId(target.id);
    setProfileOpen(true);
  };

  const activeUsers = useMemo(() => {
    return customers.filter((u) => u.status === "active" && u.approved);
  }, [customers]);

  const filteredPendingUsers = useMemo(
    () =>
      pendingStaff.filter((u) => roleFilter === "all" || u.role === roleFilter),
    [pendingStaff, roleFilter]
  );

  const showCustomerMetrics = roleFilter === "customer" || roleFilter === "all";

  const baseColumns: ColumnDef<CustomerListItem>[] = [
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

  const customerColumns: ColumnDef<CustomerListItem>[] = [
    ...baseColumns,
    ...(showCustomerMetrics
      ? ([
          {
            id: "segment",
            header: "Segment",
            cell: ({ row }: { row: { original: CustomerListItem } }) => (
              <StatusBadge status={row.original.segment ?? "regular"} />
            ),
          },
          {
            id: "joined",
            header: "Joined",
            cell: ({ row }: { row: { original: CustomerListItem } }) => (
              <span className="text-xs whitespace-nowrap">
                {formatDateTime(row.original.joinDate)}
              </span>
            ),
          },
          {
            id: "firstBooking",
            header: "First Booking",
            cell: ({ row }: { row: { original: CustomerListItem } }) =>
              row.original.role === "customer" ? (
                <span className="text-xs whitespace-nowrap">
                  {row.original.firstBookingAt
                    ? formatDateTime(row.original.firstBookingAt)
                    : "—"}
                </span>
              ) : (
                "—"
              ),
          },
          {
            id: "visits",
            header: "Visits",
            cell: ({ row }: { row: { original: CustomerListItem } }) =>
              row.original.role === "customer" ? row.original.visitCount : "—",
          },
        ] as ColumnDef<CustomerListItem>[])
      : []),
    {
      accessorKey: "computedTotalBookings",
      header: "Bookings",
      cell: ({ row }) => row.original.computedTotalBookings ?? 0,
    },
    {
      accessorKey: "computedTotalSpent",
      header: "Total Spent",
      cell: ({ row }) =>
        row.original.computedTotalSpent
          ? formatCurrency(row.original.computedTotalSpent)
          : "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.role === "customer" && (
            <Button size="sm" variant="secondary" onClick={() => openProfile(row.original)}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              Profile
            </Button>
          )}
          {canManageUser(actorRole, row.original.role) ? (
            <Button size="sm" variant="outline" onClick={() => handleSuspend(row.original)}>
              Suspend
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Protected</span>
          )}
        </div>
      ),
    },
  ];

  const pendingColumns: ColumnDef<User>[] = [
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        canManageUser(actorRole, row.original.role) ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(row.original)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleSuspend(row.original)}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Super Admin only</span>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Customers shown by default. View join date, first booking, visits, and full profile
            details.
          </p>
          <div className="w-full max-w-xs">
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">{ROLE_LABELS.customer}</SelectItem>
                <SelectItem value="all">All roles</SelectItem>
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
              Active Users ({activeUsers.length})
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
                data={activeUsers}
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

      <CustomerProfileDialog
        userId={profileUserId}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </>
  );
}
