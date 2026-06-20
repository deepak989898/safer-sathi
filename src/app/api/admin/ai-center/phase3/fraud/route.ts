import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  blockUser,
  hydratePhase3Store,
  listBlockedUsers,
  listFraudLogs,
  runFraudCheckAndLog,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydratePhase3Store();
    const status = searchParams.get("status") as "open" | "resolved" | "blocked" | null;

    return apiSuccess({
      fraud: listFraudLogs(status ?? undefined),
      blocked: listBlockedUsers(),
    });
  } catch {
    return apiError("Failed to load fraud data", 500);
  }
}

const postSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  action: z.enum(["scan", "block"]),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  amount: z.number().optional(),
  serviceType: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  userId: z.string().optional(),
  reason: z.string().optional(),
  permanent: z.boolean().optional(),
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
    const actorId = parsed.data.actorId ?? "super_admin";

    if (parsed.data.action === "block") {
      const blocked = await blockUser({
        email: parsed.data.email,
        phone: parsed.data.phone,
        userId: parsed.data.userId,
        reason: parsed.data.reason ?? "Manual block by Super Admin",
        permanent: parsed.data.permanent ?? false,
        blockedBy: actorId,
      });
      return apiSuccess({ blocked });
    }

    if (!parsed.data.customerEmail || !parsed.data.amount) {
      return apiError("customerEmail and amount required for fraud scan", 400);
    }

    const log = await runFraudCheckAndLog(
      {
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone ?? "",
        amount: parsed.data.amount,
        serviceType: parsed.data.serviceType ?? "package",
        userId: parsed.data.userId,
      },
      actorId
    );
    return apiSuccess({ fraud: log });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Fraud action failed", 500);
  }
}
