import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import {
  isAiEnquiryStorageConfigured,
  listAiAssistantEnquiries,
} from "@/lib/ai/travel-manager/enquiry-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const enquiries = await listAiAssistantEnquiries(300);
    return apiSuccess({
      enquiries,
      serverConfigured: isAiEnquiryStorageConfigured(),
      count: enquiries.length,
    });
  } catch (err) {
    console.error("List AI enquiries error:", err);
    return apiError("Failed to list AI enquiries", 500);
  }
}
