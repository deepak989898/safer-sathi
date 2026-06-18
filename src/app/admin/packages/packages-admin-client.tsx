"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  canApprovePackages,
  canGenerateMarketPackages,
} from "@/lib/auth/constants";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { TourPackage } from "@/types";
import { toast } from "sonner";

export default function PackagesAdminClient() {
  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [destination, setDestination] = useState("Goa");
  const [durationDays, setDurationDays] = useState("5");
  const [selected, setSelected] = useState<TourPackage | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/packages");
      const json = await res.json();
      if (json.success) setPackages(json.data);
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const pending = packages.filter((p) => p.publishStatus === "pending_approval");
  const published = packages.filter((p) => p.publishStatus === "published");
  const rejected = packages.filter((p) => p.publishStatus === "rejected");

  const handleGenerate = async () => {
    if (!canGenerateMarketPackages(actorRole)) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/market-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          durationDays: Number(durationDays) || 5,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      toast.success("Market package draft created — awaiting Super Admin approval");
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate package");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (pkg: TourPackage) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}?action=approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          approvedBy: user?.name ?? "super_admin",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Approval failed");
      toast.success("Package published on website");
      setSelected(null);
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    }
  };

  const handleReject = async (pkg: TourPackage) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}?action=reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, reason: "Needs revision" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Reject failed");
      toast.success("Package rejected");
      setSelected(null);
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/admin/packages/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          updates: {
            price: Number(editPrice) || selected.price,
            description: {
              en: editDescription,
              hi: editDescription,
            },
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success("Package updated");
      setSelected(json.data);
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const openReview = (pkg: TourPackage) => {
    setSelected(pkg);
    setEditPrice(String(pkg.price));
    setEditDescription(localizedText(pkg.description, "en"));
  };

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
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={
            row.original.publishStatus === "published"
              ? "active"
              : row.original.publishStatus === "pending_approval"
                ? "pending"
                : "cancelled"
          }
          label={row.original.publishStatus?.replace("_", " ") ?? "published"}
        />
      ),
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-xs capitalize text-muted-foreground">
          {row.original.proposedBy?.replace(/_/g, " ") ?? "admin"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => openReview(row.original)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Packages"
        description="AI market packages — Super Admin approves before website publish"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-4 sm:p-6">
        {canGenerateMarketPackages(actorRole) && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Goa, Kerala, Rajasthan..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={14}
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Market Package
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              AI analyzes market rates, builds full package details with images and
              itinerary. Package stays hidden until Super Admin approves.
            </p>
          </div>
        )}

        {!canApprovePackages(actorRole) && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Managers can generate and edit drafts. Only Super Admin can approve
            packages for the public website.
          </p>
        )}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            <TabsTrigger value="all">All ({packages.length})</TabsTrigger>
          </TabsList>

          {["pending", "published", "rejected", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <DataTable
                  columns={columns}
                  data={
                    tab === "all"
                      ? packages
                      : tab === "pending"
                        ? pending
                        : tab === "published"
                          ? published
                          : rejected
                  }
                  searchKey="title"
                  searchPlaceholder="Search packages..."
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{localizedText(selected.title, "en")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {selected.marketAnalysis && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="font-medium">Market analysis</p>
                    <p className="mt-1 text-muted-foreground">
                      {localizedText(selected.marketAnalysis, "en")}
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Price (₹)</Label>
                    <Input
                      className="mt-1"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      disabled={!canApprovePackages(actorRole) && selected.publishStatus === "published"}
                    />
                  </div>
                  <div>
                    <Label>Original price</Label>
                    <p className="mt-2 font-medium">
                      {selected.originalPrice
                        ? formatCurrency(selected.originalPrice)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    className="mt-1 min-h-[100px]"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div>
                  <p className="font-medium">Cities</p>
                  <p className="text-muted-foreground">{selected.cities.join(", ")}</p>
                </div>
                <div>
                  <p className="font-medium">Inclusions</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {selected.inclusions.map((inc, i) => (
                      <li key={i}>{localizedText(inc, "en")}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Itinerary ({selected.itinerary.length} days)</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {selected.itinerary.map((day) => (
                      <li key={day.day}>
                        Day {day.day}: {localizedText(day.title, "en")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {(actorRole === "super_admin" || actorRole === "manager") && (
                  <Button variant="outline" onClick={handleSaveEdit}>
                    Save edits
                  </Button>
                )}
                {canApprovePackages(actorRole) &&
                  selected.publishStatus === "pending_approval" && (
                    <>
                      <Button variant="outline" onClick={() => handleReject(selected)}>
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button onClick={() => handleApprove(selected)}>
                        <Check className="mr-2 h-4 w-4" />
                        Approve & Publish
                      </Button>
                    </>
                  )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
