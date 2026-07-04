import FlightBookingDetailAdminClient from "./flight-booking-detail-admin-client";

export default async function AdminFlightBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <FlightBookingDetailAdminClient bookingId={bookingId} />;
}
