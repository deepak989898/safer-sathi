import fs from "fs";
import path from "path";
import { readCatalogItem } from "@/lib/catalog/persistence";
import {
  getHotelByIdAdmin,
  getHotelBySlugPublished,
  hydrateHotelsStore,
} from "@/lib/hotel-store";
import { getTripJackHotelCatalogEntryByHid } from "@/lib/tripjack-hotels/catalog-firestore";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
import {
  getPackageByIdAdmin,
  getPublishedPackageBySlug,
  hydratePackagesStore,
} from "@/lib/package-store";
import {
  getVehicleByIdAdmin,
  hydrateVehiclesStore,
} from "@/lib/vehicle-store";
import { PACKAGE_IMAGE_SOURCES } from "@/lib/media/package-images";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { VEHICLE_IMAGE_SOURCES } from "@/lib/media/vehicle-images";
import { appUrl } from "@/lib/site-config";
import type { Booking, Hotel, ServiceType, TourPackage, Vehicle } from "@/types";

export interface InvoiceServiceImage {
  base64: string;
  format: "PNG" | "JPEG";
}

type CatalogSlice = { images?: string[]; slug?: string };

function isVehicleType(serviceType: ServiceType): boolean {
  return (
    serviceType === "vehicle" ||
    serviceType === "car_rental" ||
    serviceType === "tempo_traveller" ||
    serviceType === "bus" ||
    serviceType === "airport_pickup"
  );
}

function isPackageType(serviceType: ServiceType): boolean {
  return serviceType === "package" || serviceType === "holiday";
}

function idToSlug(id: string): string {
  for (const prefix of ["pkg-", "veh-", "htl-"]) {
    if (id.startsWith(prefix)) return id.slice(prefix.length);
  }
  return id;
}

function detectFormat(buffer: Buffer, contentType?: string | null): "PNG" | "JPEG" | null {
  if (contentType?.includes("png") || (buffer[0] === 0x89 && buffer[1] === 0x50)) {
    return "PNG";
  }
  if (
    contentType?.includes("jpeg") ||
    contentType?.includes("jpg") ||
    (buffer[0] === 0xff && buffer[1] === 0xd8)
  ) {
    return "JPEG";
  }
  return null;
}

function fromBuffer(buffer: Buffer, contentType?: string | null): InvoiceServiceImage | null {
  const format = detectFormat(buffer, contentType);
  if (!format) return null;
  return { base64: buffer.toString("base64"), format };
}

function toAbsoluteImageUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return appUrl(src.startsWith("/") ? src : `/${src}`);
}

function loadFromLocalPublic(relativePath: string): InvoiceServiceImage | null {
  const clean = relativePath.replace(/^\//, "");
  const localPath = path.join(process.cwd(), "public", clean);
  try {
    if (!fs.existsSync(localPath)) return null;
    return fromBuffer(fs.readFileSync(localPath));
  } catch {
    return null;
  }
}

async function loadFromUrl(raw: string): Promise<InvoiceServiceImage | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    const local = loadFromLocalPublic(trimmed);
    if (local) return local;
  }

  const url = toAbsoluteImageUrl(trimmed);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return fromBuffer(buffer, response.headers.get("content-type"));
  } catch {
    return null;
  }
}

async function tryLoadUrls(urls: string[]): Promise<InvoiceServiceImage | null> {
  for (const url of urls) {
    const image = await loadFromUrl(url);
    if (image) return image;
  }
  return null;
}

async function fetchCatalogSlice(booking: Booking): Promise<CatalogSlice | null> {
  const { serviceType, serviceId } = booking;
  if (!serviceId || serviceId.startsWith("ai_")) return null;

  if (serviceType === "hotel") {
    // For TripJack hotel bookings, serviceId is usually tjHotelId (numeric).
    const parsedHid = Number(serviceId);
    if (Number.isFinite(parsedHid) && parsedHid > 0) {
      const tripjackHotel = await getTripJackHotelCatalogEntryByHid(parsedHid);
      if (tripjackHotel) {
        return {
          images: resolveHotelImageCandidates({
            heroImage: tripjackHotel.heroImage,
            imageUrls: tripjackHotel.imageUrls,
          }),
          slug: tripjackHotel.cityName || `tj_${parsedHid}`,
        };
      }
    }

    await hydrateHotelsStore();
    let hotel: Hotel | null = getHotelByIdAdmin(serviceId);
    if (!hotel) hotel = await readCatalogItem<Hotel>("hotels", serviceId);
    if (!hotel) hotel = getHotelBySlugPublished(serviceId);
    if (!hotel) hotel = getHotelBySlugPublished(idToSlug(serviceId));
    return hotel;
  }

  if (isPackageType(serviceType)) {
    await hydratePackagesStore();
    let pkg: TourPackage | null = getPackageByIdAdmin(serviceId);
    if (!pkg) pkg = await readCatalogItem<TourPackage>("packages", serviceId);
    if (!pkg) pkg = getPublishedPackageBySlug(serviceId);
    if (!pkg) pkg = getPublishedPackageBySlug(idToSlug(serviceId));
    return pkg;
  }

  if (isVehicleType(serviceType)) {
    await hydrateVehiclesStore();
    let vehicle: Vehicle | null = getVehicleByIdAdmin(serviceId);
    if (!vehicle) vehicle = await readCatalogItem<Vehicle>("vehicles", serviceId);
    return vehicle;
  }

  return null;
}

function fallbackUrls(serviceType: ServiceType, slug?: string): string[] {
  const urls: string[] = [];

  if (slug) {
    if (isPackageType(serviceType)) {
      urls.push(...(PACKAGE_IMAGE_SOURCES[slug] ?? []));
    } else if (isVehicleType(serviceType)) {
      urls.push(...(VEHICLE_IMAGE_SOURCES[slug] ?? []));
      urls.push(`/images/vehicles/${slug}/1.jpg`);
    } else if (serviceType === "hotel") {
      urls.push(`/images/hotels/${slug}/1.jpg`);
    }
  }

  if (serviceType === "hotel") {
    urls.push(TRAVEL_IMAGES.hotelLuxury, TRAVEL_IMAGES.beachResort);
  } else if (isPackageType(serviceType)) {
    urls.push(TRAVEL_IMAGES.goldenTriangle, TRAVEL_IMAGES.keralaBackwaters);
  } else if (serviceType === "bus" || serviceType === "tempo_traveller") {
    urls.push(TRAVEL_IMAGES.bus, TRAVEL_IMAGES.tempo);
  } else if (serviceType === "airport_pickup") {
    urls.push(TRAVEL_IMAGES.sedan, TRAVEL_IMAGES.suv);
  } else if (isVehicleType(serviceType)) {
    urls.push(TRAVEL_IMAGES.suv, TRAVEL_IMAGES.sedan, TRAVEL_IMAGES.luxuryCar);
  } else {
    urls.push(TRAVEL_IMAGES.goldenTriangle);
  }

  return urls;
}

export async function loadInvoiceServiceImage(
  booking: Booking
): Promise<InvoiceServiceImage | null> {
  const slice = await fetchCatalogSlice(booking);
  const slug = slice?.slug ?? idToSlug(booking.serviceId);
  const catalogUrls = slice?.images?.length ? slice.images : [];

  const primary = await tryLoadUrls(catalogUrls);
  if (primary) return primary;

  return tryLoadUrls(fallbackUrls(booking.serviceType, slug));
}
