import HotelBookingDetailAdminClient from "./hotel-booking-detail-admin-client";

export default async function AdminHotelBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <HotelBookingDetailAdminClient bookingId={bookingId} />;
}
