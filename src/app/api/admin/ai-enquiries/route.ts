import {
  isAiEnquiryStorageConfigured,
  listAiAssistantEnquiries,
} from "@/lib/ai/travel-manager/enquiry-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
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
