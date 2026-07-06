import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { TRIPJACK_HOTEL_MANUAL_DESTINATIONS_COLLECTION } from "@/lib/tripjack-hotels/catalog-types";

export interface TripJackHotelManualDestination {
  id: string;
  label: string;
  searchKey: string;
  searchKeys: string[];
  hids: number[];
  countryName: string;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSearchKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function docIdFromKey(searchKey: string): string {
  return normalizeSearchKey(searchKey).replace(/[^a-z0-9]+/g, "_");
}

export async function listTripJackHotelManualDestinations(): Promise<
  TripJackHotelManualDestination[]
> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const snap = await db.collection(TRIPJACK_HOTEL_MANUAL_DESTINATIONS_COLLECTION).get();
  return snap.docs
    .map((doc) => doc.data() as TripJackHotelManualDestination)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTripJackHotelManualDestinationByQuery(
  query: string
): Promise<TripJackHotelManualDestination | null> {
  const q = normalizeSearchKey(query);
  if (!q) return null;

  const all = await listTripJackHotelManualDestinations();
  const exact = all.find(
    (dest) =>
      dest.searchKey === q ||
      dest.searchKeys.some((key) => key === q) ||
      dest.label.toLowerCase() === q
  );
  if (exact) return exact;

  return (
    all.find(
      (dest) =>
        dest.searchKey.startsWith(q) ||
        dest.searchKeys.some((key) => key.startsWith(q)) ||
        dest.label.toLowerCase().startsWith(q)
    ) ?? null
  );
}

export async function upsertTripJackHotelManualDestination(input: {
  label: string;
  searchKeys: string[];
  hids: number[];
  countryName?: string;
  notes?: string;
  updatedBy?: string;
}): Promise<TripJackHotelManualDestination> {
  const label = input.label.trim();
  const searchKeys = [
    ...new Set(
      [label, ...input.searchKeys]
        .map(normalizeSearchKey)
        .filter(Boolean)
    ),
  ];
  const primaryKey = searchKeys[0];
  if (!primaryKey) throw new Error("Destination label is required");
  if (!input.hids.length) throw new Error("At least one hotel ID is required");

  const record: TripJackHotelManualDestination = {
    id: docIdFromKey(primaryKey),
    label,
    searchKey: primaryKey,
    searchKeys,
    hids: [...new Set(input.hids.map((hid) => Number(hid)).filter((hid) => hid > 0))],
    countryName: input.countryName?.trim() || "India",
    notes: input.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy,
  };

  if (!record.hids.length) throw new Error("Valid hotel IDs are required");

  if (!isAdminEnvConfigured()) return record;
  const db = await getSafeAdminDb();
  if (!db) return record;

  await db
    .collection(TRIPJACK_HOTEL_MANUAL_DESTINATIONS_COLLECTION)
    .doc(record.id)
    .set(sanitize(record), { merge: true });
  return record;
}

export async function deleteTripJackHotelManualDestination(id: string): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;
  await db.collection(TRIPJACK_HOTEL_MANUAL_DESTINATIONS_COLLECTION).doc(id).delete();
}

export function manualDestinationToSuggestion(
  dest: TripJackHotelManualDestination
): import("@/lib/tripjack-hotels/catalog-types").DestinationSuggestion {
  return {
    id: `manual_${dest.id}`,
    type: "city",
    label: dest.label,
    subtitle: `${dest.countryName} · ${dest.hids.length} hotel${dest.hids.length === 1 ? "" : "s"} (manual)`,
    hotelCount: dest.hids.length,
    hids: dest.hids,
  };
}
