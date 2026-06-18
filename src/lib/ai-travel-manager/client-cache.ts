import type { AIPackageDraft } from "./types";

const PACKAGE_DRAFTS_KEY = "safar_sathi_ai_package_drafts";

export function loadLocalPackageDrafts(): AIPackageDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKAGE_DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AIPackageDraft[];
  } catch {
    return [];
  }
}

export function saveLocalPackageDraft(draft: AIPackageDraft): void {
  if (typeof window === "undefined") return;
  const existing = loadLocalPackageDrafts().filter((p) => p.id !== draft.id);
  localStorage.setItem(
    PACKAGE_DRAFTS_KEY,
    JSON.stringify([draft, ...existing])
  );
}

export function mergePackageDrafts(
  remote: AIPackageDraft[],
  local: AIPackageDraft[]
): AIPackageDraft[] {
  const map = new Map<string, AIPackageDraft>();
  for (const item of [...remote, ...local]) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function syncLocalPackageDrafts(drafts: AIPackageDraft[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PACKAGE_DRAFTS_KEY, JSON.stringify(drafts));
}
