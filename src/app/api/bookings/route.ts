import { z } from "zod";
import {
  createBooking,
  generateBookingNumber,
  getBookings,
  getCustomerBookings,
} from "@/lib/data-service";
import { createAdminNotification } from "@/lib/admin/notifications";
import { adminBookingsHref } from "@/lib/admin/booking-admin-links";
import { logAiAssistantEnquiry } from "@/lib/ai/travel-manager/enquiry-service";
import { authorizeBookingsList } from "@/lib/bookings/booking-access";
import { validateBookingAmount } from "@/lib/bookings/booking-price-validation";
import { calculateAdvanceAmount } from "@/lib/payments/booking-payment";
import {
  calculateRewardDiscount,
  getCustomerRewards,
  normalizeRedeemPoints,
  reserveRewardPoints,
} from "@/lib/rewards/rewards-service";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
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
  departure: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
  aiProcessed: z.boolean().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
  rewardPointsToRedeem: z.number().int().nonnegative().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId") ?? undefined;
    const access = await authorizeBookingsList(request, requestedUserId);
    if ("error" in access) return access.error;

    const bookings =
      access.user.role === "customer"
        ? await getCustomerBookings(access.user.id, access.user.email)
        : await getBookings(access.userId);
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

    const customerUser = await optionalAuthenticateRequest(request);
    const isCustomer = customerUser?.role === "customer" ? customerUser : null;

    const originalAmount = priceCheck.amount;
    let finalAmount = originalAmount;
    let rewardPointsRedeemed = 0;
    let rewardDiscount = 0;
    let linkedUserId = parsed.data.userId ?? "guest";

    if (isCustomer) {
      linkedUserId = isCustomer.id;
    }

    if (parsed.data.rewardPointsToRedeem && parsed.data.rewardPointsToRedeem > 0) {
      if (!isCustomer) {
        return apiError("Sign in to redeem reward points.", 401);
      }

      const rewards = await getCustomerRewards(isCustomer.id);
      const points = normalizeRedeemPoints(
        parsed.data.rewardPointsToRedeem,
        rewards.rewardPoints,
        originalAmount
      );

      if (points <= 0) {
        return apiError(
          "Enter at least 50 points (max 20% of booking value).",
          400
        );
      }

      rewardPointsRedeemed = points;
      rewardDiscount = calculateRewardDiscount(points);
      finalAmount = Math.max(1, originalAmount - rewardDiscount);
    }

    const now = new Date().toISOString();
    const bookingNumber = generateBookingNumber();
    const bookingId = `bk_${Date.now()}`;

    if (rewardPointsRedeemed > 0 && isCustomer) {
      const reserved = await reserveRewardPoints({
        userId: isCustomer.id,
        points: rewardPointsRedeemed,
        bookingId,
        bookingNumber,
      });
      if (!reserved.ok) {
        return apiError(reserved.error, 400);
      }
    }

    const booking = await createBooking({
      id: bookingId,
      bookingNumber,
      userId: linkedUserId,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      serviceType: parsed.data.serviceType,
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      guests: parsed.data.guests,
      amount: finalAmount,
      originalAmount: rewardDiscount > 0 ? originalAmount : undefined,
      rewardPointsRedeemed: rewardPointsRedeemed || undefined,
      rewardDiscount: rewardDiscount || undefined,
      bookingMode: parsed.data.bookingMode,
      distanceKm: parsed.data.distanceKm,
      departure: parsed.data.departure,
      destination: parsed.data.destination,
      depositAmount: calculateAdvanceAmount(finalAmount),
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
        aiReply: `Booking ${booking.bookingNumber} · ₹${finalAmount.toLocaleString("en-IN")}`,
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
        packagePrice: finalAmount,
      });
    }

    await createAdminNotification({
      type: "booking_pending",
      title: `New booking — ${booking.bookingNumber}`,
      message:
        parsed.data.serviceType === "vehicle" &&
        (parsed.data.departure || parsed.data.destination)
          ? `${booking.customerName} · ${parsed.data.serviceName.en} · ${parsed.data.departure ?? "—"} → ${parsed.data.destination ?? "—"} · awaiting payment`
          : `${booking.customerName} · ${parsed.data.serviceName.en} · awaiting payment`,
      href: adminBookingsHref(booking),
      bookingId: booking.id,
    });

    return apiSuccess(booking, 201);
  } catch (err) {
    console.error("Create booking error:", err);
    return apiError("Failed to create booking", 500);
  }
}
