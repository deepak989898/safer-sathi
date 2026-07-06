import type { BusPassengerDetail } from "@/lib/seatseller/types";

export interface BuildBlockTicketPayloadInput {
  tripId: string;
  sourceCityId: string;
  destinationCityId: string;
  boardingPointId: string;
  droppingPointId: string;
  passengers: BusPassengerDetail[];
  operatorId?: string;
}

/** SeatSeller blockTicket body — matches live API field names/types. */
export function buildSeatSellerBlockPayload(
  input: BuildBlockTicketPayloadInput
): Record<string, unknown> {
  const inventoryItems = input.passengers.map((passenger, index) => ({
    seatname: passenger.seatName,
    seatName: passenger.seatName,
    fare: formatSeatSellerBlockFare(passenger.fare),
    ladiesSeat: passenger.ladiesSeat ? "true" : "false",
    passenger: {
      title: passenger.title,
      name: passenger.name,
      age: passenger.age,
      gender: passenger.gender,
      mobile: passenger.mobile,
      email: passenger.email,
      idType: passenger.idType,
      idNumber: passenger.idNumber,
      address: passenger.address,
      primary: index === 0 ? "true" : "false",
    },
  }));

  const payload: Record<string, unknown> = {
    availableTripID: input.tripId,
    boardingPointId: input.boardingPointId,
    droppingPointId: input.droppingPointId,
    source: input.sourceCityId,
    destination: input.destinationCityId,
    inventoryItems,
    totalFare: formatSeatSellerBlockFare(
      input.passengers.reduce((sum, passenger) => sum + passenger.fare, 0)
    ),
  };

  if (input.operatorId) {
    payload.operator = input.operatorId;
  }

  return payload;
}

export function formatSeatSellerBlockFare(fare: number): string {
  return Number(fare).toFixed(2);
}
