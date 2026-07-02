import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { estimateOpenAiImageCostUsd } from "@/lib/ai/openai-images";
import type { AiImageGenerationLog } from "@/lib/ai-center/types";

const COLLECTION = "ai_image_generation_logs";

let logCache: AiImageGenerationLog[] = [];

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function hydrateImageGenerationLogs(limit = 200): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
    logCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AiImageGenerationLog);
  } catch (error) {
    console.warn("hydrateImageGenerationLogs failed:", error);
  }
}

export function listImageGenerationLogs(limit = 50): AiImageGenerationLog[] {
  return logCache.slice(0, limit);
}

export function countSuccessfulImagesThisMonth(): number {
  const key = monthKey();
  return logCache.filter(
    (log) => log.success && log.createdAt.startsWith(key.slice(0, 7))
  ).length;
}

export function estimateMonthlyImageCost(): number {
  const key = monthKey();
  const count = logCache.filter(
    (log) => log.success && log.createdAt.startsWith(key.slice(0, 7))
  ).length;
  const avgCost =
    logCache
      .filter((log) => log.success && log.estimatedCostUsd)
      .slice(0, 20)
      .reduce((sum, log, _, arr) => sum + (log.estimatedCostUsd ?? 0) / arr.length, 0) ||
    estimateOpenAiImageCostUsd();
  return Math.round(count * avgCost * 1000) / 1000;
}

export async function addImageGenerationLog(
  entry: Omit<AiImageGenerationLog, "id" | "createdAt">
): Promise<AiImageGenerationLog> {
  const log: AiImageGenerationLog = {
    ...entry,
    id: `imglog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    estimatedCostUsd: entry.success ? (entry.estimatedCostUsd ?? estimateOpenAiImageCostUsd()) : 0,
  };

  logCache = [log, ...logCache].slice(0, 300);

  if (isAdminEnvConfigured()) {
    try {
      const db = await getSafeAdminDb();
      if (db) {
        await db.collection(COLLECTION).doc(log.id).set(sanitize(log));
      }
    } catch (error) {
      console.warn("addImageGenerationLog persist failed:", error);
    }
  }

  return log;
}

export function getImageGenerationStats(options?: {
  model?: string;
  quality?: "low" | "medium" | "high";
}) {
  const estimatedCostPerImageUsd = estimateOpenAiImageCostUsd({
    model: options?.model,
    quality: options?.quality,
    size: "1536x1024",
  });
  return {
    monthlyGenerated: countSuccessfulImagesThisMonth(),
    monthlyCostEstimateUsd: estimateMonthlyImageCost(),
    estimatedCostPerImageUsd,
  };
}
