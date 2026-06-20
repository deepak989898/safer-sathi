import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  hydratePhase3Store,
  listPriceRules,
  listPricingHistory,
  runDynamicPricingScan,
  updatePriceRule,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydratePhase3Store();
    const status = searchParams.get("status") as "pending" | "approved" | "rejected" | null;

    return apiSuccess({
      pricing: listPricingHistory(status ?? undefined),
      rules: listPriceRules(),
    });
  } catch {
    return apiError("Failed to load pricing", 500);
  }
}

const postSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  action: z.enum(["scan", "update_rule"]),
  ruleId: z.string().optional(),
  ruleUpdates: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    await hydratePhase3Store();

    if (parsed.data.action === "scan") {
      const created = await runDynamicPricingScan();
      return apiSuccess({ created, count: created.length });
    }

    if (parsed.data.action === "update_rule" && parsed.data.ruleId) {
      const rule = await updatePriceRule(
        parsed.data.ruleId,
        (parsed.data.ruleUpdates ?? {}) as Parameters<typeof updatePriceRule>[1]
      );
      return apiSuccess({ rule });
    }

    return apiError("Invalid action", 400);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Pricing action failed", 500);
  }
}
