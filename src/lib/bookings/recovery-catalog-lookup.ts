import { reloadHotelsStore, getPublishedHotels } from "@/lib/hotel-store";
import { reloadPackagesStore, getPublishedPackages } from "@/lib/package-store";
import { reloadVehiclesStore, getPublishedVehicles } from "@/lib/vehicle-store";
import { localizedText } from "@/lib/i18n";
import type { LocalizedString, ServiceType } from "@/types";

export interface ResolvedCatalogService {
  serviceType: ServiceType;
  serviceId: string;
  serviceName: LocalizedString;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nameMatches(candidate: string, query: string): boolean {
  const a = normalizeName(candidate);
  const b = normalizeName(query);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export async function findCatalogServiceByName(
  serviceName: string
): Promise<ResolvedCatalogService | null> {
  const query = serviceName.trim();
  if (!query) return null;

  await Promise.all([reloadHotelsStore(), reloadPackagesStore(), reloadVehiclesStore()]);

  for (const hotel of getPublishedHotels()) {
    const label = localizedText(hotel.name, "en");
    if (nameMatches(label, query)) {
      return {
        serviceType: "hotel",
        serviceId: hotel.id,
        serviceName: hotel.name,
      };
    }
  }

  for (const pkg of getPublishedPackages()) {
    const label = localizedText(pkg.title, "en");
    if (nameMatches(label, query)) {
      return {
        serviceType: "package",
        serviceId: pkg.id,
        serviceName: pkg.title,
      };
    }
  }

  for (const vehicle of getPublishedVehicles()) {
    const label = localizedText(vehicle.name, "en");
    if (nameMatches(label, query)) {
      return {
        serviceType: "vehicle",
        serviceId: vehicle.id,
        serviceName: vehicle.name,
      };
    }
  }

  return null;
}

export function parseBookingNotificationMessage(message: string): {
  customerName?: string;
  serviceName?: string;
} {
  const parts = message
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return {};

  return {
    customerName: parts[0],
    serviceName: parts[1]
      .replace(/awaiting payment/i, "")
      .replace(/paid in full/i, "")
      .replace(/partial payment/i, "")
      .trim(),
  };
}
