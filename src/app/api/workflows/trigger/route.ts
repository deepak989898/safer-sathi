import { z } from "zod";
import { executeWorkflow } from "@/lib/automation/workflow-engine";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(1),
  trigger: z.string().min(1),
  bookingId: z.string().optional(),
  actorId: z.string().optional(),
  steps: z.array(
    z.object({
      action: z.enum(["invoice", "whatsapp", "email", "crm_update", "payment_reminder"]),
      params: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await executeWorkflow(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Workflow trigger error:", err);
    return apiError("Failed to execute workflow", 500);
  }
}
