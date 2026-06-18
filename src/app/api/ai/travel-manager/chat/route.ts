import { z } from "zod";
import { runAIChatCommand } from "@/lib/ai-travel-manager/agents/chat-command";
import {
  actorRoleSchema,
  requireChat,
} from "@/lib/ai-travel-manager/api-auth";
import { hydrateAITravelManagerStore } from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  actorRole: actorRoleSchema,
  message: z.string().min(3),
  createdBy: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const denied = requireChat(parsed.data.actorRole);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    const result = await runAIChatCommand(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("AI chat command error:", err);
    return apiError("Failed to process chat command", 500);
  }
}
