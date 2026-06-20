import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  generateAiReport,
  getAiReportById,
  hydrateAiAnalyticsStore,
  listAiReports,
} from "@/lib/ai-center/analytics-service";
import type { AiReportPeriod } from "@/lib/ai-center/types";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiAnalyticsStore();
    const id = searchParams.get("id");
    const format = searchParams.get("format");

    if (id) {
      const report = getAiReportById(id);
      if (!report) return apiError("Report not found", 404);

      if (format === "csv") {
        return new Response(report.csvData, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${report.id}.csv"`,
          },
        });
      }
      if (format === "pdf") {
        return new Response(report.pdfHtml, {
          headers: {
            "Content-Type": "text/html",
            "Content-Disposition": `attachment; filename="${report.id}.html"`,
          },
        });
      }
      return apiSuccess({ report });
    }

    return apiSuccess({ reports: listAiReports() });
  } catch (err) {
    console.error("List reports error:", err);
    return apiError("Failed to list reports", 500);
  }
}

const generateSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly"]),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    const report = await generateAiReport(
      parsed.data.period as AiReportPeriod,
      parsed.data.actorId
    );
    return apiSuccess({ report });
  } catch (err) {
    console.error("Generate report error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate report", 500);
  }
}
