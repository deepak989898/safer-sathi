"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Database, Loader2, Sparkles, Trash2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import {
  canApprovePackages,
  canGenerateMarketPackages,
} from "@/lib/auth/constants";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { PackageCategory, PackagePublishStatus, TourPackage } from "@/types";
import { toast } from "sonner";

export default function PackagesAdminClient() {
  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [destination, setDestination] = useState("Goa");
  const [durationDays, setDurationDays] = useState("5");
  const [selected, setSelected] = useState<TourPackage | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCities, setEditCities] = useState("");
  const [editImages, setEditImages] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editTransport, setEditTransport] = useState("");
  const [editInclusions, setEditInclusions] = useState("");
  const [editExclusions, setEditExclusions] = useState("");
  const [editActivities, setEditActivities] = useState("");
  const [editHotels, setEditHotels] = useState("");
  const [editStatus, setEditStatus] = useState<PackagePublishStatus>("published");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editSlug, setEditSlug] = useState("");
  const [editDurationLabel, setEditDurationLabel] = useState("");
  const [editCategory, setEditCategory] = useState<PackageCategory>("domestic");
  const [editItineraryJson, setEditItineraryJson] = useState("");

  const isStaff = actorRole === "super_admin" || actorRole === "manager";

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

  const drafts = packages.filter((p) => p.publishStatus === "draft");
  const pending = packages.filter((p) => p.publishStatus === "pending_approval");
  const published = packages.filter((p) => p.publishStatus === "published");
  const rejected = packages.filter((p) => p.publishStatus === "rejected");

  const handleSeedPackages = async () => {
    if (!isStaff) return;
    if (!confirm("Insert or update all 20 professional tour packages in Firebase?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/packages?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Seed failed");
      toast.success(json.data.message ?? "20 tour packages seeded");
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed packages");
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (pkg: TourPackage) => {
    if (!isStaff) return;
    if (!confirm(`Delete "${localizedText(pkg.title, "en")}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/packages/${pkg.id}?actorRole=${encodeURIComponent(actorRole)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed");
      toast.success("Package deleted");
      setSelected(null);
      loadPackages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

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
    setSaving(true);
    try {
      let itinerary = selected.itinerary;
      if (editItineraryJson.trim()) {
        try {
          itinerary = JSON.parse(editItineraryJson);
        } catch {
          throw new Error("Invalid itinerary JSON");
        }
      }

      const res = await fetch(`/api/admin/packages/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          updates: {
            slug: editSlug,
            category: editCategory,
            price: Number(editPrice) || selected.price,
            originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
            featured: editFeatured,
            publishStatus: editStatus,
            title: { en: editTitle, hi: editTitle },
            durationLabel: { en: editDurationLabel, hi: editDurationLabel },
            cities: editCities.split(",").map((s) => s.trim()).filter(Boolean),
            images: editImages.split("\n").map((s) => s.trim()).filter(Boolean),
            description: { en: editDescription, hi: editDescription },
            transport: { en: editTransport, hi: editTransport },
            activities: editActivities.split(",").map((s) => s.trim()).filter(Boolean),
            hotels: editHotels.split(",").map((s) => s.trim()).filter(Boolean),
            inclusions: editInclusions
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => ({ en: s, hi: s })),
            exclusions: editExclusions
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => ({ en: s, hi: s })),
            itinerary,
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
    } finally {
      setSaving(false);
    }
  };

  const openReview = (pkg: TourPackage) => {
    setSelected(pkg);
    setEditPrice(String(pkg.price));
    setEditOriginalPrice(pkg.originalPrice ? String(pkg.originalPrice) : "");
    setEditDescription(localizedText(pkg.description, "en"));
    setEditTitle(localizedText(pkg.title, "en"));
    setEditCities(pkg.cities.join(", "));
    setEditImages(pkg.images.join("\n"));
    setEditTransport(pkg.transport ? localizedText(pkg.transport, "en") : "");
    setEditInclusions(pkg.inclusions.map((i) => localizedText(i, "en")).join("\n"));
    setEditExclusions(pkg.exclusions.map((i) => localizedText(i, "en")).join("\n"));
    setEditActivities(pkg.activities.join(", "));
    setEditHotels(pkg.hotels.join(", "));
    setEditStatus(pkg.publishStatus ?? "published");
    setEditFeatured(pkg.featured);
    setEditSlug(pkg.slug);
    setEditDurationLabel(localizedText(pkg.durationLabel, "en"));
    setEditCategory(pkg.category);
    setEditItineraryJson(JSON.stringify(pkg.itinerary, null, 2));
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
        title="Tour Packages"
        description="Manage 20+ professional packages — seed, edit, publish to website"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-4 sm:p-6">
        {isStaff && (
          <div className="flex flex-wrap gap-3">
            <Button variant="default" onClick={handleSeedPackages} disabled={seeding}>
              {seeding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Seed Tour Packages (20)
            </Button>
          </div>
        )}

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

        <Tabs defaultValue="drafts">
          <TabsList>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            <TabsTrigger value="all">All ({packages.length})</TabsTrigger>
          </TabsList>

          {["drafts", "pending", "published", "rejected", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <DataTable
                  columns={columns}
                  data={
                    tab === "all"
                      ? packages
                      : tab === "drafts"
                        ? drafts
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
                    <Label>Slug</Label>
                    <Input className="mt-1" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                  </div>
                  <div>
                    <Label>Duration label</Label>
                    <Input
                      className="mt-1"
                      value={editDurationLabel}
                      onChange={(e) => setEditDurationLabel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Category</Label>
                    <Select value={editCategory} onValueChange={(v) => setEditCategory(v as PackageCategory)}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["domestic", "international", "religious", "adventure", "family", "honeymoon"] as const).map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as PackagePublishStatus)}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Active (published)</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">Pending approval</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Input
                      className="mt-1"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Price (₹)</Label>
                    <Input
                      className="mt-1"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Original price (₹)</Label>
                    <Input
                      className="mt-1"
                      value={editOriginalPrice}
                      onChange={(e) => setEditOriginalPrice(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <input
                      id="featured"
                      type="checkbox"
                      checked={editFeatured}
                      onChange={(e) => setEditFeatured(e.target.checked)}
                    />
                    <Label htmlFor="featured">Featured on homepage</Label>
                  </div>
                </div>
                <div>
                  <Label>Cities (comma-separated)</Label>
                  <Input
                    className="mt-1"
                    value={editCities}
                    onChange={(e) => setEditCities(e.target.value)}
                  />
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
                  <Label>Image URLs (one per line)</Label>
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    value={editImages}
                    onChange={(e) => setEditImages(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Transport</Label>
                  <Input
                    className="mt-1"
                    value={editTransport}
                    onChange={(e) => setEditTransport(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Activities (comma-separated)</Label>
                  <Input
                    className="mt-1"
                    value={editActivities}
                    onChange={(e) => setEditActivities(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Hotels (comma-separated)</Label>
                  <Input className="mt-1" value={editHotels} onChange={(e) => setEditHotels(e.target.value)} />
                </div>
                <div>
                  <Label>Inclusions (one per line)</Label>
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    value={editInclusions}
                    onChange={(e) => setEditInclusions(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Exclusions (one per line)</Label>
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    value={editExclusions}
                    onChange={(e) => setEditExclusions(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Itinerary (JSON)</Label>
                  <Textarea
                    className="mt-1 min-h-[120px] font-mono text-xs"
                    value={editItineraryJson}
                    onChange={(e) => setEditItineraryJson(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {isStaff && (
                  <Button variant="destructive" onClick={() => handleDelete(selected)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                {isStaff && (
                  <Button variant="outline" onClick={handleSaveEdit} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
