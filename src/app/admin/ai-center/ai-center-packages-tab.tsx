"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Package, Sparkles, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/i18n";
import type { AiTourPackage } from "@/lib/ai-center/types";
import { toast } from "sonner";

interface CatalogOption {
  id: string;
  name: string;
}

export function AiCenterPackagesTab({
  actorRole,
  actorId,
  busy,
  setBusy,
}: {
  actorRole: string;
  actorId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
}) {
  const [packages, setPackages] = useState<AiTourPackage[]>([]);
  const [hotels, setHotels] = useState<CatalogOption[]>([]);
  const [vehicles, setVehicles] = useState<CatalogOption[]>([]);
  const [destination, setDestination] = useState("Manali");
  const [durationDays, setDurationDays] = useState(5);
  const [hotelId, setHotelId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [useGeneratedHotel, setUseGeneratedHotel] = useState(false);
  const [useGeneratedVehicle, setUseGeneratedVehicle] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/ai-center/packages?actorRole=${actorRole}`);
    const json = await res.json();
    if (json.success) {
      setPackages(json.data.packages ?? []);
      setHotels(json.data.hotels ?? []);
      setVehicles(json.data.vehicles ?? []);
    }
  }, [actorRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          actorId,
          destination,
          durationDays,
          hotelId: hotelId || undefined,
          vehicleId: vehicleId || undefined,
          useGeneratedHotel,
          useGeneratedVehicle,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Package generated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const action = async (id: string, act: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action: act, ...extra }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Package ${act}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/ai-center/packages/${id}?actorRole=${actorRole}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Tour Package Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Manali, Goa, Dubai..." />
          </div>
          <div>
            <Label>Duration (days)</Label>
            <Input type="number" min={2} max={14} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value) || 5)} />
          </div>
          <div>
            <Label>Hotel (existing)</Label>
            <Select value={hotelId || "none"} onValueChange={(v) => setHotelId(!v || v === "none" ? "" : v)} disabled={useGeneratedHotel}>
              <SelectTrigger><SelectValue placeholder="Select hotel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto match</SelectItem>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehicle (existing)</Label>
            <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(!v || v === "none" ? "" : v)} disabled={useGeneratedVehicle}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto match</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <span className="text-sm">Generate new hotel details</span>
            <Switch checked={useGeneratedHotel} onCheckedChange={setUseGeneratedHotel} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
            <span className="text-sm">Generate new vehicle details</span>
            <Switch checked={useGeneratedVehicle} onCheckedChange={setUseGeneratedVehicle} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => void generate()} disabled={busy || !destination.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
              Generate Package
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-2 text-left">Package</th>
              <th className="p-2 text-left">Destination</th>
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b">
                <td className="p-2">
                  <p className="font-medium">{pkg.title}</p>
                  <p className="text-xs text-muted-foreground">{pkg.hotel.name} · {pkg.vehicle.name}</p>
                </td>
                <td className="p-2">{pkg.destination}</td>
                <td className="p-2">{formatCurrency(pkg.price)}</td>
                <td className="p-2"><StatusBadge status={pkg.status} /></td>
                <td className="p-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    {pkg.status !== "approved" && pkg.status !== "published" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void action(pkg.id, "approve")}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    {pkg.status === "approved" && (
                      <Button size="sm" disabled={busy} onClick={() => void action(pkg.id, "publish")}>Publish</Button>
                    )}
                    {pkg.status !== "published" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void action(pkg.id, "reject")}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void action(pkg.id, "regenerate")}>Regen</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(pkg.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {packages.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No AI packages yet. Generate one above.</p>
        )}
      </div>
    </div>
  );
}
