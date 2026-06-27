"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Database, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminCityFilter } from "@/components/admin/admin-city-filter";
import { AdminImageThumbnail } from "@/components/admin/admin-image-gallery";
import { AdminImageUrlField } from "@/components/admin/admin-image-url-field";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch } from "@/lib/admin/api-client";
import {
  canApproveVehicles,
  canGenerateMarketVehicles,
} from "@/lib/auth/constants";
import { buildCityCounts, filterByCity } from "@/lib/admin/city-filter";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { PackagePublishStatus, Vehicle, VehicleStatus, VehicleType } from "@/types";
import { toast } from "sonner";

function getVehicleCities(vehicle: Vehicle): string[] {
  return vehicle.location?.trim() ? [vehicle.location.trim()] : [];
}

const vehicleTypes: VehicleType[] = [
  "car",
  "suv",
  "luxury",
  "tempo_traveller",
  "mini_bus",
  "bus",
];

function parsePriceInput(value: string, fallback?: number): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return fallback ?? 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : (fallback ?? 0);
}

const emptyForm = {
  name: "",
  nameHi: "",
  slug: "",
  brand: "",
  category: "",
  type: "suv" as VehicleType,
  seats: "",
  pricePerDay: "",
  pricePerKm: "",
  location: "",
  description: "",
  images: "",
  features: "",
  fuelType: "Petrol",
  driverIncluded: true,
  available: true,
  status: "active" as VehicleStatus,
};

export default function VehiclesAdminClient() {
  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateName, setGenerateName] = useState("Toyota Innova Crysta");
  const [generateType, setGenerateType] = useState<VehicleType>("suv");
  const [generateLocation, setGenerateLocation] = useState("Delhi NCR");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("all");
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const isStaff = actorRole === "super_admin" || actorRole === "manager";

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/api/admin/vehicles", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        setVehicles(Array.isArray(data) ? data : (data.vehicles ?? []));
      } else toast.error(json.error ?? "Failed to load vehicles");
    } catch {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    adminApiFetch("/api/admin/firebase-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        const { configured, firestoreConnected, error } = json.data ?? {};
        if (!configured || !firestoreConnected) {
          toast.error(
            error ??
              "Firebase is not connected. Vehicle saves will not persist until FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set on Vercel.",
            { duration: 12000 }
          );
        }
      })
      .catch(() => {});
  }, []);

  const drafts = vehicles.filter((v) => v.publishStatus === "draft");
  const pending = vehicles.filter((v) => v.publishStatus === "pending_approval");
  const published = vehicles.filter(
    (v) => !v.publishStatus || v.publishStatus === "published"
  );
  const rejected = vehicles.filter((v) => v.publishStatus === "rejected");

  const handleGenerate = async () => {
    if (!canGenerateMarketVehicles(actorRole)) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/market-vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generateName,
          type: generateType,
          location: generateLocation,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      toast.success("Market vehicle draft created — awaiting Super Admin approval");
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate vehicle");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (vehicle: Vehicle) => {
    try {
      const res = await adminApiFetch(`/api/admin/vehicles/${vehicle.id}?action=approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedBy: user?.name ?? "super_admin",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Approval failed");
      toast.success("Vehicle published on website");
      setSelected(null);
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    }
  };

  const handleReject = async (vehicle: Vehicle) => {
    try {
      const res = await adminApiFetch(`/api/admin/vehicles/${vehicle.id}?action=reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Needs revision" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Reject failed");
      toast.success("Vehicle rejected");
      setSelected(null);
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    }
  };

  const handleSeedVehicles = async () => {
    if (!isStaff) return;
    if (!confirm("Insert or update all 30 professional vehicles in Firebase?")) return;
    setSeeding(true);
    try {
      const res = await adminApiFetch("/api/admin/vehicles?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Seed failed");
      toast.success(json.data.message ?? "30 vehicles seeded");
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed vehicles");
    } finally {
      setSeeding(false);
    }
  };

  const buildVehiclePayload = (f: typeof emptyForm, existing?: Vehicle) => ({
    slug: f.slug || existing?.slug,
    name: { en: f.name, hi: f.nameHi || f.name },
    brand: f.brand || existing?.brand,
    category: f.category || existing?.category,
    type: f.type,
    seats: Number(f.seats) || 4,
    pricePerDay: parsePriceInput(f.pricePerDay, existing?.pricePerDay),
    pricePerKm: f.pricePerKm
      ? parsePriceInput(f.pricePerKm, existing?.pricePerKm)
      : existing?.pricePerKm,
    location: f.location || "Delhi NCR",
    description: { en: f.description, hi: f.description },
    images: f.images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    available: f.status === "active" && f.available,
    status: f.status,
    publishStatus:
      existing?.publishStatus ??
      (f.status === "active" ? "published" : ("draft" as PackagePublishStatus)),
    fuelType: f.fuelType,
    driverIncluded: f.driverIncluded,
    features: f.features
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    rating: existing?.rating ?? 4.5,
    reviewCount: existing?.reviewCount ?? 0,
  });

  const handleAdd = async () => {
    if (!form.name || !form.seats || !form.pricePerDay) {
      toast.error("Name, seats, and price per day are required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminApiFetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: buildVehiclePayload(form),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to add vehicle");
      toast.success("Vehicle added");
      setForm(emptyForm);
      setAddOpen(false);
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const openReview = (vehicle: Vehicle) => {
    setSelected(vehicle);
    setForm({
      name: vehicle.name.en,
      nameHi: vehicle.name.hi,
      slug: vehicle.slug ?? "",
      brand: vehicle.brand ?? "",
      category: vehicle.category ?? "",
      type: vehicle.type,
      seats: String(vehicle.seats),
      pricePerDay: String(vehicle.pricePerDay),
      pricePerKm: vehicle.pricePerKm ? String(vehicle.pricePerKm) : "",
      location: vehicle.location,
      description: localizedText(vehicle.description, "en"),
      images: vehicle.images.join("\n"),
      features: vehicle.features.join(", "),
      fuelType: vehicle.fuelType,
      driverIncluded: vehicle.driverIncluded,
      available: vehicle.available,
      status: vehicle.status ?? (vehicle.available ? "active" : "inactive"),
    });
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await adminApiFetch(`/api/admin/vehicles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: buildVehiclePayload(form, selected),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success("Vehicle updated");
      setSelected(null);
      setForm(emptyForm);
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      const res = await adminApiFetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed");
      toast.success("Vehicle deleted");
      loadVehicles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const formFields = (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label>Name (English)</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Toyota Innova Crysta"
        />
      </div>
      <div className="grid gap-2">
        <Label>Name (Hindi)</Label>
        <Input
          value={form.nameHi}
          onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
          placeholder="टोयोटा इनोवा क्रिस्टा"
        />
      </div>
      <div className="grid gap-2">
        <Label>Brand</Label>
        <Input
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          placeholder="Toyota"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="toyota-innova-crysta"
          />
        </div>
        <div className="grid gap-2">
          <Label>Category label</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="SUV"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => setForm({ ...form, type: v as VehicleType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Seats</Label>
          <Input
            type="number"
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Price/Day (₹)</Label>
          <Input
            type="number"
            value={form.pricePerDay}
            onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Price/KM (₹)</Label>
          <Input
            type="number"
            value={form.pricePerKm}
            onChange={(e) => setForm({ ...form, pricePerKm: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="grid gap-2">
          <Label>Location</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Delhi NCR"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Fuel type</Label>
          <Input
            value={form.fuelType}
            onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as VehicleStatus })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Features (comma-separated)</Label>
        <Input
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          placeholder="AC, GPS, Music System"
        />
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <AdminImageUrlField
        label="Images"
        value={form.images}
        onChange={(images) => setForm({ ...form, images })}
        folder="vehicles"
        actorRole={actorRole}
        rows={3}
        disabled={saving}
        placeholder="https://images.unsplash.com/..."
      />
      <div className="flex flex-wrap items-center gap-4">
        <input
          id="driverIncluded"
          type="checkbox"
          checked={form.driverIncluded}
          onChange={(e) => setForm({ ...form, driverIncluded: e.target.checked })}
        />
        <Label htmlFor="driverIncluded">Driver included</Label>
        <input
          id="available"
          type="checkbox"
          checked={form.available}
          onChange={(e) => setForm({ ...form, available: e.target.checked })}
        />
        <Label htmlFor="available">Available on website</Label>
      </div>
    </div>
  );

  const columns: ColumnDef<Vehicle>[] = [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <AdminImageThumbnail
          images={row.original.images}
          alt={localizedText(row.original.name, "en")}
        />
      ),
    },
    {
      id: "name",
      header: "Vehicle",
      cell: ({ row }) => localizedText(row.original.name, "en"),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.type.replace(/_/g, " ")}</span>
      ),
    },
    { accessorKey: "seats", header: "Seats" },
    {
      accessorKey: "pricePerDay",
      header: "Price/Day",
      cell: ({ row }) => formatCurrency(row.original.pricePerDay),
    },
    { accessorKey: "location", header: "Location" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={
            row.original.publishStatus === "published" || !row.original.publishStatus
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
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => openReview(row.original)}>
            Review
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const tableForTab = (tab: string) => {
    if (tab === "drafts") return drafts;
    if (tab === "pending") return pending;
    if (tab === "published") return published;
    if (tab === "rejected") return rejected;
    return vehicles;
  };

  const tabData = useMemo(() => tableForTab(activeTab), [activeTab, vehicles, drafts, pending, published, rejected]);
  const cityOptions = useMemo(() => buildCityCounts(tabData, getVehicleCities), [tabData]);
  const filteredData = useMemo(
    () => filterByCity(tabData, cityFilter, getVehicleCities),
    [tabData, cityFilter]
  );

  return (
    <>
      <AdminHeader
        title="Vehicles"
        description="Manage 30+ professional fleet — seed, edit prices, images and availability"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap justify-end gap-3">
          {isStaff && (
            <Button variant="default" onClick={handleSeedVehicles} disabled={seeding}>
              {seeding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Seed Vehicles (30)
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="size-4" />
              Add Vehicle
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              {formFields}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {canGenerateMarketVehicles(actorRole) && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>Vehicle name</Label>
                  <Input
                    value={generateName}
                    onChange={(e) => setGenerateName(e.target.value)}
                    placeholder="Toyota Innova Crysta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={generateType}
                    onValueChange={(v) => setGenerateType(v as VehicleType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={generateLocation}
                    onChange={(e) => setGenerateLocation(e.target.value)}
                    placeholder="Delhi NCR"
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Market Vehicle
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              AI analyzes market rates, builds full vehicle details with images and pricing.
              Vehicle stays hidden until Super Admin approves.
            </p>
          </div>
        )}

        {!canApproveVehicles(actorRole) && canGenerateMarketVehicles(actorRole) && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Managers can generate and edit drafts. Only Super Admin can approve vehicles for the public website.
          </p>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            setCityFilter(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            <TabsTrigger value="all">All ({vehicles.length})</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <AdminCityFilter
              label="City / Location"
              cities={cityOptions}
              totalCount={tabData.length}
              selectedCity={cityFilter}
              onChange={setCityFilter}
            />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading vehicles...</p>
            ) : (
              <DataTable
                columns={columns}
                data={filteredData}
                searchKey="name"
                searchPlaceholder="Search vehicles..."
                hidePagination
              />
            )}
          </div>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? localizedText(selected.name, "en") : "Review Vehicle"}
            </DialogTitle>
          </DialogHeader>
          {selected?.marketAnalysis && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Market analysis</p>
              <p className="mt-1 text-muted-foreground">
                {localizedText(selected.marketAnalysis, "en")}
              </p>
            </div>
          )}
          {formFields}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {isStaff && (
              <Button variant="outline" onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save edits
              </Button>
            )}
            {canApproveVehicles(actorRole) &&
              selected?.publishStatus === "pending_approval" && (
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
        </DialogContent>
      </Dialog>
    </>
  );
}
