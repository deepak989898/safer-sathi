"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Database, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminImageThumbnail } from "@/components/admin/admin-image-gallery";
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
import type { Hotel, HotelStatus } from "@/types";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  nameHi: "",
  slug: "",
  city: "",
  state: "",
  country: "India",
  location: "",
  address: "",
  starRating: "4",
  priceFrom: "",
  description: "",
  amenities: "",
  images: "",
  roomsJson: "",
  available: true,
  featured: false,
  status: "active" as HotelStatus,
};

export default function HotelsAdminClient() {
  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const isStaff = actorRole === "super_admin" || actorRole === "manager";
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const handleSeedHotels = async () => {
    if (!isStaff) return;
    if (!confirm("Insert or update all 60 professional hotels in Firebase?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/hotels?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Seed failed");
      toast.success(json.data.message ?? "60 hotels seeded");
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed hotels");
    } finally {
      setSeeding(false);
    }
  };

  const buildPayload = (f: typeof emptyForm, existing?: Hotel) => {
    let rooms = existing?.rooms ?? [];
    if (f.roomsJson.trim()) {
      try {
        rooms = JSON.parse(f.roomsJson);
      } catch {
        throw new Error("Invalid rooms JSON");
      }
    }
    return {
      slug: f.slug || existing?.slug,
      name: { en: f.name, hi: f.nameHi || f.name },
      city: f.city,
      state: f.state,
      country: f.country,
      location: f.location,
      address: f.address,
      starRating: Number(f.starRating) || 4,
      priceFrom: Number(f.priceFrom) || 0,
      description: { en: f.description, hi: f.description },
      amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      images: f.images.split("\n").map((s) => s.trim()).filter(Boolean),
      rooms,
      featured: f.featured,
      status: f.status,
      available: f.status === "active" && f.available,
      rating: existing?.rating ?? 4.5,
      reviewCount: existing?.reviewCount ?? 0,
    };
  };

  const openEdit = (hotel: Hotel) => {
    setSelected(hotel);
    setForm({
      name: hotel.name.en,
      nameHi: hotel.name.hi,
      slug: hotel.slug,
      city: hotel.city,
      state: hotel.state ?? "",
      country: hotel.country ?? "India",
      location: hotel.location,
      address: hotel.address ?? "",
      starRating: String(hotel.starRating),
      priceFrom: String(hotel.priceFrom),
      description: localizedText(hotel.description, "en"),
      amenities: hotel.amenities.join(", "),
      images: hotel.images.join("\n"),
      roomsJson: JSON.stringify(hotel.rooms, null, 2),
      available: hotel.available,
      featured: hotel.featured ?? false,
      status: hotel.status ?? (hotel.available ? "active" : "inactive"),
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.city || !form.priceFrom) {
      toast.error("Name, city and price are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, hotel: buildPayload(form) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to add");
      toast.success("Hotel added");
      setForm(emptyForm);
      setAddOpen(false);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add hotel");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hotels/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, updates: buildPayload(form, selected) }),
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

  const handleDelete = async (hotel: Hotel) => {
    if (!confirm(`Delete "${localizedText(hotel.name, "en")}"?`)) return;
    try {
      const res = await fetch(
        `/api/admin/hotels/${hotel.id}?actorRole=${encodeURIComponent(actorRole)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Delete failed");
      toast.success("Hotel deleted");
      setSelected(null);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const formFields = (
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
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Star rating</Label>
          <Input type="number" min={1} max={5} value={form.starRating} onChange={(e) => setForm({ ...form, starRating: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>State</Label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Location / Area</Label>
        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Price from (₹/night)</Label>
          <Input type="number" value={form.priceFrom} onChange={(e) => setForm({ ...form, priceFrom: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as HotelStatus })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Amenities (comma-separated)</Label>
        <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Image URLs (one per line)</Label>
        <Textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Rooms (JSON array)</Label>
        <Textarea rows={4} className="font-mono text-xs" value={form.roomsJson} onChange={(e) => setForm({ ...form, roomsJson: e.target.value })} placeholder='[{"type":"deluxe","pricePerNight":8500,...}]' />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
          Available on website
        </label>
      </div>
    </div>
  );

  const columns: ColumnDef<Hotel>[] = [
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
      header: "Hotel",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{localizedText(row.original.name, "en")}</p>
          <p className="text-xs text-muted-foreground">{row.original.city}</p>
        </div>
      ),
    },
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
          label={row.original.status ?? (row.original.available ? "active" : "inactive")}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          {isStaff && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage 60+ professional hotels — seed, edit prices, rooms and images"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap justify-end gap-3">
          {isStaff && (
            <Button onClick={handleSeedHotels} disabled={seeding}>
              {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Seed Hotels (60)
            </Button>
          )}
          {isStaff && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <Plus className="mr-2 h-4 w-4" />
                Add Hotel
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Hotel</DialogTitle></DialogHeader>
                {formFields}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Hotel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading hotels...</p>
        ) : (
          <DataTable
            columns={columns}
            data={hotels}
            searchKey="name"
            searchPlaceholder="Search hotels..."
            hidePagination
          />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Hotel</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
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
