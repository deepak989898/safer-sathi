import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { deleteDuplicateBlogs } from "@/lib/ai-center/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const result = await deleteDuplicateBlogs(auth.user.id);
    return apiSuccess(result);
  } catch (err) {
    console.error("Cleanup duplicate blogs error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to delete duplicate blogs",
      500
    );
  }
}
