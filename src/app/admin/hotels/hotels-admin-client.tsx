"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Star } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Hotel } from "@/types";
import { toast } from "sonner";

export default function HotelsAdminClient() {
  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [form, setForm] = useState({
    name: "",
    nameHi: "",
    city: "",
    location: "",
    starRating: "3",
    priceFrom: "",
    description: "",
    amenities: "",
    images: "",
    available: true,
  });

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hotels");
      const json = await res.json();
      if (json.success) setHotels(json.data);
      else toast.error(json.error ?? "Failed to load hotels");
    } catch {
      toast.error("Failed to load hotels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  const openEdit = (hotel: Hotel) => {
    setSelected(hotel);
    setForm({
      name: hotel.name.en,
      nameHi: hotel.name.hi,
      city: hotel.city,
      location: hotel.location,
      starRating: String(hotel.starRating),
      priceFrom: String(hotel.priceFrom),
      description: localizedText(hotel.description, "en"),
      amenities: hotel.amenities.join(", "),
      images: hotel.images.join("\n"),
      available: hotel.available,
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          updates: {
            name: { en: form.name, hi: form.nameHi || form.name },
            city: form.city,
            location: form.location,
            starRating: Number(form.starRating) || 3,
            priceFrom: Number(form.priceFrom) || 0,
            description: { en: form.description, hi: form.description },
            amenities: form.amenities
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            images: form.images
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            available: form.available,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success("Hotel updated");
      setSelected(null);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<Hotel>[] = [
    {
      id: "name",
      header: "Hotel",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{localizedText(row.original.name, "en")}</p>
          <p className="text-xs text-muted-foreground">{row.original.location}</p>
        </div>
      ),
    },
    { accessorKey: "city", header: "City" },
    {
      accessorKey: "starRating",
      header: "Stars",
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: row.original.starRating }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      ),
    },
    {
      accessorKey: "priceFrom",
      header: "From",
      cell: ({ row }) => formatCurrency(row.original.priceFrom),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.available ? "active" : "paused"}
          label={row.original.available ? "Available" : "Unavailable"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Edit hotel catalog — prices, images, and descriptions"
        adminName={user?.name ?? "Admin"}
      />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading hotels...</p>
        ) : (
          <DataTable
            columns={columns}
            data={hotels}
            searchKey="name"
            searchPlaceholder="Search hotels..."
          />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Hotel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name (English)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Name (Hindi)</Label>
              <Input value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Star rating</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.starRating}
                  onChange={(e) => setForm({ ...form, starRating: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Price from (₹)</Label>
              <Input
                type="number"
                value={form.priceFrom}
                onChange={(e) => setForm({ ...form, priceFrom: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Amenities (comma-separated)</Label>
              <Input
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Image URLs (one per line)</Label>
              <Textarea
                rows={3}
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="hotel-available"
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              <Label htmlFor="hotel-available">Available on website</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
