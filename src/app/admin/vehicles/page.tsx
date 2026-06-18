"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { demoVehicles } from "@/data/demo-data";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Vehicle, VehicleType } from "@/types";

const vehicleTypes: VehicleType[] = [
  "car",
  "suv",
  "luxury",
  "tempo_traveller",
  "mini_bus",
  "bus",
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(demoVehicles);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "suv" as VehicleType,
    seats: "",
    pricePerDay: "",
    pricePerKm: "",
    location: "",
  });

  const handleAdd = () => {
    if (!form.name || !form.seats || !form.pricePerDay) return;

    const newVehicle: Vehicle = {
      id: `v${Date.now()}`,
      name: { en: form.name, hi: form.name },
      type: form.type,
      seats: Number(form.seats),
      pricePerDay: Number(form.pricePerDay),
      pricePerKm: Number(form.pricePerKm) || Math.round(Number(form.pricePerDay) / 200),
      images: [],
      available: true,
      fuelType: "Petrol",
      driverIncluded: true,
      description: { en: "New vehicle added via admin panel.", hi: "एडमिन पैनल से नया वाहन जोड़ा गया।" },
      features: [],
      rating: 0,
      reviewCount: 0,
      location: form.location || "Delhi",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setVehicles((prev) => [...prev, newVehicle]);
    setForm({ name: "", type: "suv", seats: "", pricePerDay: "", pricePerKm: "", location: "" });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

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
    {
      accessorKey: "pricePerKm",
      header: "Price/KM",
      cell: ({ row }) =>
        row.original.pricePerKm
          ? formatCurrency(row.original.pricePerKm)
          : "—",
    },
    { accessorKey: "location", header: "Location" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.available ? "active" : "paused"} label={row.original.available ? "Available" : "Unavailable"} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm">
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
        description="Manage your fleet of vehicles"
        adminName="Rajesh Kumar"
      />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={<Button />}
            >
              <Plus className="size-4" />
              Add Vehicle
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Vehicle Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Toyota Innova Crysta"
                  />
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
                    <Label htmlFor="seats">Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      value={form.seats}
                      onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price/Day (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={form.pricePerDay}
                      onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priceKm">Price/KM (₹)</Label>
                  <Input
                    id="priceKm"
                    type="number"
                    value={form.pricePerKm}
                    onChange={(e) => setForm({ ...form, pricePerKm: e.target.value })}
                    placeholder="Auto-calculated if empty"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Delhi NCR"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add Vehicle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <DataTable
          columns={columns}
          data={vehicles}
          searchKey="name"
          searchPlaceholder="Search vehicles..."
        />
      </div>
    </>
  );
}
