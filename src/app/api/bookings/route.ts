import { z } from "zod";
import {
  createBooking,
  generateBookingNumber,
  getBookings,
} from "@/lib/data-service";
import { createAdminNotification } from "@/lib/admin/notifications";
import { logAiAssistantEnquiry } from "@/lib/ai/travel-manager/enquiry-service";
import { authorizeBookingsList } from "@/lib/bookings/booking-access";
import { validateBookingAmount } from "@/lib/bookings/booking-price-validation";
import { calculateAdvanceAmount } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const requestedUserId = searchParams.get("userId") ?? undefined;
    const access = await authorizeBookingsList(request, requestedUserId);
    if ("error" in access) return access.error;

    const bookings = await getBookings(access.userId);
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

    const priceCheck = await validateBookingAmount(parsed.data);
    if (!priceCheck.ok) {
      return apiError(priceCheck.message, 400);
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
      amount: priceCheck.amount,
      bookingMode: parsed.data.bookingMode,
      distanceKm: parsed.data.distanceKm,
      depositAmount: calculateAdvanceAmount(priceCheck.amount),
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
        aiReply: `Booking ${booking.bookingNumber} · ₹${priceCheck.amount.toLocaleString("en-IN")}`,
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
        packagePrice: priceCheck.amount,
      });
    }

    await createAdminNotification({
      type: "booking_pending",
      title: `New booking — ${booking.bookingNumber}`,
      message: `${booking.customerName} · ${parsed.data.serviceName.en} · awaiting payment`,
      href: "/admin/bookings",
      bookingId: booking.id,
    });

    return apiSuccess(booking, 201);
  } catch (err) {
    console.error("Create booking error:", err);
    return apiError("Failed to create booking", 500);
  }
}
