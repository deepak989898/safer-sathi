import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  getAiCenterSettings,
  getImageGenerationStats,
  hydrateAiCenterStore,
  listImageGenerationLogs,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    await hydrateAiCenterStore();
    const logs = listImageGenerationLogs(100);
    const aiSettings = getAiCenterSettings();
    const stats = getImageGenerationStats({
      model: aiSettings.openAiImageModel,
      quality: aiSettings.openAiImageQuality,
    });

    return apiSuccess({ logs, stats });
  } catch (err) {
    console.error("Image generation logs error:", err);
    return apiError("Failed to load image generation logs", 500);
  }
}
