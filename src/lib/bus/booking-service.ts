import { buildSeatSellerBlockPayload } from "@/lib/seatseller/block-payload";
import { parseSeatSellerBlockTicketResponse } from "@/lib/seatseller/parse-block-response";
import {
  blockTicket,
  bookTicket,
  cancelTicket,
  fetchCancellationData,
  getUpdatedFare,
} from "@/lib/seatseller/client";
import {
  createBusBooking,
  generateBusBookingId,
  getBusBookingById,
  updateBusBooking,
} from "@/lib/bus/firestore";
import type {
  BusBookingRecord,
  BusPassengerDetail,
  BusPassengerGender,
} from "@/lib/seatseller/types";

const BLOCK_MINUTES = 8;

export interface BlockBusTicketInput {
  userId: string;
  sourceCityId: string;
  sourceCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  doj: string;
  tripId: string;
  operatorName: string;
  busType: string;
  boardingPoint: BusBookingRecord["boardingPoint"];
  droppingPoint: BusBookingRecord["droppingPoint"];
  passengers: BusPassengerDetail[];
  callFareBreakupApi?: boolean;
  cancellationPolicy?: string;
  bpDpSeatLayout?: boolean;
  operatorId?: string;
}

export function validateSeatGenderRules(
  passengers: Array<{ gender: BusPassengerGender; seatName: string }>,
  seats: Array<{ name: string; ladiesSeat?: boolean; malesSeat?: boolean }>
): string | null {
  for (const passenger of passengers) {
    const seat = seats.find((s) => s.name === passenger.seatName);
    if (!seat) return `Invalid seat: ${passenger.seatName}`;
    if (seat.ladiesSeat && passenger.gender !== "FEMALE") {
      return `Seat ${seat.name} is reserved for female passengers`;
    }
    if (seat.malesSeat && passenger.gender !== "MALE") {
      return `Seat ${seat.name} is reserved for male passengers`;
    }
  }
  return null;
}

export async function blockBusTicket(
  input: BlockBusTicketInput
): Promise<BusBookingRecord> {
  const totalFare = input.passengers.reduce((sum, p) => sum + p.fare, 0);
  const baseFare = totalFare;
  const taxes = 0;

  const bookingId = generateBusBookingId();
  const blockPayload = buildSeatSellerBlockPayload({
    tripId: input.tripId,
    sourceCityId: input.sourceCityId,
    destinationCityId: input.destinationCityId,
    boardingPointId: input.boardingPoint.id,
    droppingPointId: input.droppingPoint.id,
    passengers: input.passengers,
    operatorId: input.bpDpSeatLayout ? input.operatorId : input.operatorId,
  });

  const blockResponseRaw = await blockTicket(blockPayload, bookingId);
  const blockResponse = parseSeatSellerBlockTicketResponse(blockResponseRaw);
  const expiresAt = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000).toISOString();

  const primary = input.passengers[0];
  const record: BusBookingRecord = {
    bookingId,
    userId: input.userId,
    customerName: primary.name,
    customerEmail: primary.email,
    customerMobile: primary.mobile,
    sourceCityId: input.sourceCityId,
    sourceCityName: input.sourceCityName,
    destinationCityId: input.destinationCityId,
    destinationCityName: input.destinationCityName,
    doj: input.doj,
    tripId: input.tripId,
    operatorName: input.operatorName,
    busType: input.busType,
    seatNames: input.passengers.map((p) => p.seatName),
    boardingPoint: input.boardingPoint,
    droppingPoint: input.droppingPoint,
    passengerDetails: input.passengers,
    baseFare,
    taxes,
    totalFare,
    blockKey: blockResponse.blockKey,
    blockExpiresAt: expiresAt,
    status: "seat_blocked",
    paymentStatus: "pending",
    cancellationPolicy: input.cancellationPolicy,
    callFareBreakupApi: input.callFareBreakupApi,
    apiResponses: { blockTicket: blockResponse },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return createBusBooking(record);
}

export async function confirmBusTicketAfterPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<BusBookingRecord> {
  const booking = await getBusBookingById(input.bookingId);
  if (!booking) throw new Error("Bus booking not found");
  if (!booking.blockKey) throw new Error("No block key on booking");

  if (booking.blockExpiresAt && new Date(booking.blockExpiresAt) < new Date()) {
    await updateBusBooking(booking.bookingId, {
      status: "confirmation_failed",
      paymentStatus: "paid",
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
    });
    throw new Error("Seat block expired before ticket confirmation");
  }

  await updateBusBooking(booking.bookingId, {
    status: "payment_success",
    paymentStatus: "paid",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  let finalFare = booking.totalFare;
  let updatedFareResponse: unknown;

  if (booking.callFareBreakupApi) {
    updatedFareResponse = await getUpdatedFare(booking.blockKey, booking.bookingId);
    const fare = updatedFareResponse as { totalFare?: number };
    if (fare.totalFare !== undefined) {
      finalFare = fare.totalFare;
    }
  }

  try {
    const bookResponse = await bookTicket(
      {
        blockKey: booking.blockKey,
        totalFare: finalFare,
      },
      booking.bookingId
    );

    return (
      (await updateBusBooking(booking.bookingId, {
        status: "confirmed",
        tin: bookResponse.tin,
        pnr: bookResponse.pnr,
        operatorPnr: String(
          (bookResponse as Record<string, unknown>).operatorPnr ??
            (bookResponse as Record<string, unknown>).operator_pnr ??
            ""
        ) || undefined,
        totalFare: finalFare,
        apiResponses: {
          ...booking.apiResponses,
          updatedFare: updatedFareResponse,
          bookTicket: bookResponse,
        },
      })) ?? booking
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Book ticket failed";
    return (
      (await updateBusBooking(booking.bookingId, {
        status: "manual_review_required",
        apiResponses: {
          ...booking.apiResponses,
          bookTicketError: message,
        },
      })) ?? booking
    );
  }
}

export async function cancelBusBooking(
  bookingId: string,
  seatsToCancel?: string[]
): Promise<BusBookingRecord> {
  const booking = await getBusBookingById(bookingId);
  if (!booking?.tin) throw new Error("Booking not found or not confirmed");

  const cancellationData = await fetchCancellationData(booking.tin, bookingId);
  if (cancellationData.cancelable === false) {
    throw new Error("This ticket cannot be cancelled");
  }

  const cancelResponse = await cancelTicket(
    {
      tin: booking.tin,
      seatsToCancel: seatsToCancel ?? booking.seatNames,
    },
    bookingId
  );

  return (
    (await updateBusBooking(bookingId, {
      status: "cancelled",
      paymentStatus: "refunded",
      refundAmount: cancellationData.refundableAmount,
      cancellationCharges: cancellationData.cancellationCharges,
      apiResponses: {
        ...booking.apiResponses,
        cancellationData,
        cancelTicket: cancelResponse,
      },
    })) ?? booking
  );
}

export async function retryBusTicketConfirmation(
  bookingId: string
): Promise<BusBookingRecord> {
  const booking = await getBusBookingById(bookingId);
  if (!booking?.blockKey) throw new Error("Booking has no block key");
  if (!booking.razorpayPaymentId) throw new Error("Payment not completed");

  const bookResponse = await bookTicket(
    { blockKey: booking.blockKey, totalFare: booking.totalFare },
    bookingId
  );

  return (
    (await updateBusBooking(bookingId, {
      status: "confirmed",
      tin: bookResponse.tin,
      pnr: bookResponse.pnr,
      apiResponses: { ...booking.apiResponses, bookTicketRetry: bookResponse },
    })) ?? booking
  );
}
