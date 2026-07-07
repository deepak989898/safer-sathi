"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Database, Loader2, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
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
  canApproveHotels,
  canGenerateMarketHotels,
} from "@/lib/auth/constants";
import { buildCityCounts, filterByCity } from "@/lib/admin/city-filter";
import { applyAdminHotelPriceFrom } from "@/lib/catalog/hotel-pricing";
import { formatCurrency, localizedText } from "@/lib/i18n";
import type { Hotel, HotelStatus, PackagePublishStatus } from "@/types";
import { toast } from "sonner";

function getHotelCities(hotel: Hotel): string[] {
  return hotel.city?.trim() ? [hotel.city.trim()] : [];
}

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
  const [generating, setGenerating] = useState(false);
  const [generateCity, setGenerateCity] = useState("Goa");
  const [generateStars, setGenerateStars] = useState("4");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("all");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [manualWebsiteEnabled, setManualWebsiteEnabled] = useState(true);
  const [websiteSettingsSaving, setWebsiteSettingsSaving] = useState(false);

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const [res, settingsRes] = await Promise.all([
        adminApiFetch("/api/admin/hotels"),
        adminApiFetch("/api/admin/hotel-website-settings"),
      ]);
      const json = await res.json();
      const settingsJson = await settingsRes.json();
      if (json.success) setHotels(json.data);
      else toast.error(json.error ?? "Failed to load hotels");
      if (settingsJson.success && settingsJson.data?.settings) {
        setManualWebsiteEnabled(settingsJson.data.settings.manualHotelsWebsiteEnabled !== false);
      }
    } catch {
      toast.error("Failed to load hotels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  const drafts = hotels.filter((h) => h.publishStatus === "draft");
  const pending = hotels.filter((h) => h.publishStatus === "pending_approval");
  const published = hotels.filter(
    (h) => !h.publishStatus || h.publishStatus === "published"
  );
  const rejected = hotels.filter((h) => h.publishStatus === "rejected");

  const handleGenerate = async () => {
    if (!canGenerateMarketHotels(actorRole)) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/market-hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: generateCity,
          starRating: Number(generateStars) || 4,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      toast.success("Market hotel draft created — awaiting Super Admin approval");
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate hotel");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (hotel: Hotel) => {
    try {
      const res = await adminApiFetch(`/api/admin/hotels/${hotel.id}?action=approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedBy: user?.name ?? "super_admin",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Approval failed");
      toast.success("Hotel published on website");
      setSelected(null);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    }
  };

  const handleReject = async (hotel: Hotel) => {
    try {
      const res = await adminApiFetch(`/api/admin/hotels/${hotel.id}?action=reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Needs revision" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Reject failed");
      toast.success("Hotel rejected");
      setSelected(null);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject");
    }
  };

  const handleSeedHotels = async () => {
    if (!isStaff) return;
    if (!confirm("Insert or update all 60 professional hotels in Firebase?")) return;
    setSeeding(true);
    try {
      const res = await adminApiFetch("/api/admin/hotels?action=seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
    const images = f.images.split("\n").map((s) => s.trim()).filter(Boolean);
    const { priceFrom, rooms: pricedRooms } = applyAdminHotelPriceFrom(
      Number(f.priceFrom) || existing?.priceFrom || 0,
      rooms
    );
    return {
      slug: f.slug || existing?.slug,
      name: { en: f.name, hi: f.nameHi || f.name },
      city: f.city,
      state: f.state,
      country: f.country,
      location: f.location,
      address: f.address,
      starRating: Number(f.starRating) || 4,
      priceFrom,
      description: { en: f.description, hi: f.description },
      amenities: f.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      images,
      rooms: pricedRooms,
      featured: f.featured,
      status: f.status,
      available: f.status === "active" && f.available,
      publishStatus:
        existing?.publishStatus ??
        (f.status === "active" ? "published" : ("draft" as PackagePublishStatus)),
      rating: existing?.rating ?? 4.5,
      reviewCount: existing?.reviewCount ?? 0,
    };
  };

  const openReview = (hotel: Hotel) => {
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
      const res = await adminApiFetch("/api/admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel: buildPayload(form) }),
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
      const res = await adminApiFetch(`/api/admin/hotels/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: buildPayload(form, selected) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success("Hotel updated");
      setSelected(null);
      setForm(emptyForm);
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const toggleManualWebsite = async () => {
    setWebsiteSettingsSaving(true);
    try {
      const res = await adminApiFetch("/api/admin/hotel-website-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualHotelsWebsiteEnabled: !manualWebsiteEnabled }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to update");
      setManualWebsiteEnabled(json.data.settings.manualHotelsWebsiteEnabled !== false);
      toast.success(
        json.data.settings.manualHotelsWebsiteEnabled
          ? "Manual hotels are visible on the website"
          : "Manual hotels are hidden from the website"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update visibility");
    } finally {
      setWebsiteSettingsSaving(false);
    }
  };

  const toggleHotelWebsiteVisibility = async (hotel: Hotel) => {
    const nextAvailable = !hotel.available;
    try {
      const res = await adminApiFetch(`/api/admin/hotels/${hotel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            available: nextAvailable,
            status: nextAvailable ? "active" : "inactive",
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      toast.success(nextAvailable ? "Hotel is now visible on website" : "Hotel hidden from website");
      loadHotels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update hotel");
    }
  };

  const handleDelete = async (hotel: Hotel) => {
    if (!confirm(`Delete "${localizedText(hotel.name, "en")}"?`)) return;
    try {
      const res = await adminApiFetch(`/api/admin/hotels/${hotel.id}`, { method: "DELETE" });
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
      <AdminImageUrlField
        label="Images"
        value={form.images}
        onChange={(images) => setForm({ ...form, images })}
        folder="hotels"
        actorRole={actorRole}
        rows={3}
        disabled={saving}
      />
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
          Show on website
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
      id: "website",
      header: "Website",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant={row.original.available ? "outline" : "secondary"}
          onClick={() => void toggleHotelWebsiteVisibility(row.original)}
        >
          {row.original.available ? "Visible" : "Hidden"}
        </Button>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => openReview(row.original)}>
            Review
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

  const tableForTab = (tab: string) => {
    if (tab === "drafts") return drafts;
    if (tab === "pending") return pending;
    if (tab === "published") return published;
    if (tab === "rejected") return rejected;
    return hotels;
  };

  const tabData = useMemo(() => tableForTab(activeTab), [activeTab, hotels, drafts, pending, published, rejected]);
  const cityOptions = useMemo(() => buildCityCounts(tabData, getHotelCities), [tabData]);
  const filteredData = useMemo(
    () => filterByCity(tabData, cityFilter, getHotelCities),
    [tabData, cityFilter]
  );

  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage 60+ professional hotels — seed, edit prices, rooms and images"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-4 p-6">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Manual hotels on website</p>
              <p className="text-sm text-muted-foreground">
                Show or hide all manually added hotels on /hotels. Per-hotel visibility uses the Website column.
              </p>
            </div>
            <Button
              variant={manualWebsiteEnabled ? "destructive" : "default"}
              disabled={websiteSettingsSaving}
              onClick={() => void toggleManualWebsite()}
            >
              {websiteSettingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {manualWebsiteEnabled ? "Hide all manual hotels" : "Show all manual hotels"}
            </Button>
          </div>
        </div>

        {isStaff && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSeedHotels} disabled={seeding}>
              {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Seed Hotels (60)
            </Button>
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
          </div>
        )}

        {canGenerateMarketHotels(actorRole) && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={generateCity}
                    onChange={(e) => setGenerateCity(e.target.value)}
                    placeholder="Goa, Jaipur, Manali..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Star rating</Label>
                  <Input
                    type="number"
                    min={2}
                    max={5}
                    value={generateStars}
                    onChange={(e) => setGenerateStars(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Market Hotel
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              AI analyzes market rates, builds full hotel details with rooms and images.
              Hotel stays hidden until Super Admin approves.
            </p>
          </div>
        )}

        {!canApproveHotels(actorRole) && canGenerateMarketHotels(actorRole) && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            Managers can generate and edit drafts. Only Super Admin can approve hotels for the public website.
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
            <TabsTrigger value="all">All ({hotels.length})</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <AdminCityFilter
              cities={cityOptions}
              totalCount={tabData.length}
              selectedCity={cityFilter}
              onChange={setCityFilter}
            />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading hotels...</p>
            ) : (
              <DataTable
                columns={columns}
                data={filteredData}
                searchKey="name"
                searchPlaceholder="Search hotels..."
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
              {selected ? localizedText(selected.name, "en") : "Review Hotel"}
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
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save edits
              </Button>
            )}
            {canApproveHotels(actorRole) &&
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
