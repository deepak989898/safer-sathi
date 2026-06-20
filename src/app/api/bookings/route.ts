import { z } from "zod";
import {
  createBooking,
  generateBookingNumber,
  getBookings,
} from "@/lib/data-service";
import { logAiAssistantEnquiry } from "@/lib/ai/travel-manager/enquiry-service";
import { calculateAdvanceAmount } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const createSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  serviceType: z.enum([
    "package",
    "vehicle",
    "hotel",
    "bus",
    "car_rental",
    "tempo_traveller",
    "airport_pickup",
    "holiday",
  ]),
  serviceId: z.string().min(1),
  serviceName: z.object({ en: z.string(), hi: z.string() }),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  guests: z.number().int().positive(),
  amount: z.number().positive(),
  bookingMode: z.enum(["day", "km"]).optional(),
  distanceKm: z.number().positive().optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
  aiProcessed: z.boolean().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const bookings = await getBookings(userId);
    return apiSuccess(bookings);
  } catch (err) {
    console.error("Get bookings error:", err);
    return apiError("Failed to fetch bookings", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const now = new Date().toISOString();
    const booking = await createBooking({
      bookingNumber: generateBookingNumber(),
      userId: parsed.data.userId ?? "guest",
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      serviceType: parsed.data.serviceType,
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      guests: parsed.data.guests,
      amount: parsed.data.amount,
      bookingMode: parsed.data.bookingMode,
      distanceKm: parsed.data.distanceKm,
      depositAmount: calculateAdvanceAmount(parsed.data.amount),
      paidAmount: 0,
      paymentPlan: parsed.data.paymentPlan ?? "advance",
      status: "pending",
      paymentStatus: "pending",
      aiProcessed: parsed.data.aiProcessed ?? false,
      notes: parsed.data.notes,
      createdAt: now,
      updatedAt: now,
    });

    if (parsed.data.aiProcessed) {
      await logAiAssistantEnquiry({
        request,
        userMessage: `AI booking: ${parsed.data.serviceName.en}`,
        aiReply: `Booking ${booking.bookingNumber} · ₹${parsed.data.amount.toLocaleString("en-IN")}`,
        locale: "hi",
        state: {
          step: "payment",
          intent: "tour_packages",
          selectedActivities: [],
          customerName: parsed.data.customerName,
          customerEmail: parsed.data.customerEmail,
          customerPhone: parsed.data.customerPhone,
          travelDate: parsed.data.startDate,
          guests: parsed.data.guests,
        },
        context: { userId: parsed.data.userId },
        packagePrice: parsed.data.amount,
      });
    }

    return apiSuccess(booking, 201);
  } catch (err) {
    console.error("Create booking error:", err);
    return apiError("Failed to create booking", 500);
  }
}
