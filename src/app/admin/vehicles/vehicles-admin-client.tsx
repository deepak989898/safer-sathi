"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Database, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
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
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Vehicle, VehicleStatus, VehicleType } from "@/types";
import { toast } from "sonner";

const vehicleTypes: VehicleType[] = [
  "car",
  "suv",
  "luxury",
  "tempo_traveller",
  "mini_bus",
  "bus",
];

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
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);

  const isStaff = actorRole === "super_admin" || actorRole === "manager";

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles");
      const json = await res.json();
      if (json.success) setVehicles(json.data);
      else toast.error(json.error ?? "Failed to load vehicles");
    } catch {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleSeedVehicles = async () => {
    if (!isStaff) return;
    if (!confirm("Insert or update all 30 professional vehicles in Firebase?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/vehicles?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole }),
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
    pricePerDay: Number(f.pricePerDay) || 0,
    pricePerKm: f.pricePerKm ? Number(f.pricePerKm) : undefined,
    location: f.location || "Delhi NCR",
    description: { en: f.description, hi: f.description },
    images: f.images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    available: f.status === "active" && f.available,
    status: f.status,
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
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
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

  const openEdit = (vehicle: Vehicle) => {
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
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/vehicles/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          updates: buildVehiclePayload(form, selected),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success("Vehicle updated");
      setEditOpen(false);
      setSelected(null);
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
      const res = await fetch(
        `/api/admin/vehicles/${id}?actorRole=${encodeURIComponent(actorRole)}`,
        { method: "DELETE" }
      );
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
      <div className="grid gap-2">
        <Label>Image URLs (one per line)</Label>
        <Textarea
          value={form.images}
          onChange={(e) => setForm({ ...form, images: e.target.value })}
          rows={3}
          placeholder="https://images.unsplash.com/..."
        />
      </div>
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
          status={row.original.status === "active" || row.original.available ? "active" : "paused"}
          label={row.original.status ?? (row.original.available ? "active" : "inactive")}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}>
            <Pencil className="size-3.5" />
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
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vehicles...</p>
        ) : (
          <DataTable
            columns={columns}
            data={vehicles}
            searchKey="name"
            searchPlaceholder="Search vehicles..."
          />
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
