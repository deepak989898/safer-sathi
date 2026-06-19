import {
  loadCatalogCollection,
  persistCatalogItem,
  persistCatalogItemsBatch,
  seedCatalogIfEmpty,
} from "@/lib/catalog/persistence";
import { getActivitiesSeed } from "@/data/activities-seed";
import type { Activity } from "@/types";

const ACTIVITIES_COLLECTION = "activities";

let activitiesStore: Activity[] = [];
let hydratePromise: Promise<void> | null = null;

export async function hydrateActivitiesStore(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const items = await seedCatalogIfEmpty(ACTIVITIES_COLLECTION, getActivitiesSeed());
    activitiesStore = items;
  })();

  return hydratePromise;
}

export function getPublishedActivities(): Activity[] {
  return activitiesStore.filter((a) => a.available);
}

export function getAdminActivities(): Activity[] {
  return [...activitiesStore];
}

export function getActivitiesByDestination(destination: string): Activity[] {
  const q = destination.toLowerCase();
  return getPublishedActivities().filter(
    (a) =>
      a.destination.toLowerCase().includes(q) ||
      a.tags.some((t) => q.includes(t) || t.includes(q))
  );
}

export async function upsertActivityInStore(activity: Activity): Promise<Activity> {
  activitiesStore = [activity, ...activitiesStore.filter((a) => a.id !== activity.id)];
  await persistCatalogItem(ACTIVITIES_COLLECTION, activity);
  return activity;
}

export async function seedActivities(): Promise<Activity[]> {
  const items = getActivitiesSeed();
  await persistCatalogItemsBatch(ACTIVITIES_COLLECTION, items);
  activitiesStore = [];
  hydratePromise = null;
  await hydrateActivitiesStore();
  return getAdminActivities();
}

export function resetActivitiesStore(): void {
  activitiesStore = [];
  hydratePromise = null;
}
