import { runAnalyticsAgent } from "@/lib/ai/agents/analytics-agent";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const result = await runAnalyticsAgent();
    return apiSuccess(result);
  } catch (err) {
    console.error("Analytics agent error:", err);
    return apiError("Failed to generate analytics insights", 500);
  }
}
